/**
 * One-off importer: migrate a Splitwise 2-person CSV export into Splitsy.
 *
 *   npx tsx prisma/import-splitwise.ts [path-to-csv]   # default: data/splitwise-export.csv
 *
 * The two people are read from the CSV's last two column headers, so this file
 * contains no personal data. Set their login emails and a shared temporary
 * password via environment variables (see .env.example):
 *
 *   IMPORT_EMAIL_A, IMPORT_EMAIL_B   # default: <slug-of-name>@example.com
 *   IMPORT_PASSWORD                  # default: "changeme123"
 *   IMPORT_GROUP_NAME                # default: "<A> & <B>"
 *
 * Splitwise's per-person columns are "net" values (paid − owed share) that sum
 * to zero per row. We reconstruct each expense as a single payer + exact shares
 * that reproduce those nets precisely, so the resulting Splitsy balances match
 * the export exactly. "Payment" rows become settlements.
 *
 * Running it again wipes and re-imports (idempotent).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Standard Splitwise export columns: Date,Description,Category,Cost,Currency,<A>,<B>
const PERSON_A_COL = 5;
const PERSON_B_COL = 6;

const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

/** Minimal CSV line splitter (handles quoted fields; no embedded newlines). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const cents = (s: string) => Math.round(parseFloat(s) * 100);

async function main() {
  const csvPath =
    process.argv[2] ?? join(__dirname, "..", "data", "splitwise-export.csv");
  const raw = readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/);

  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const nameA = header[PERSON_A_COL];
  const nameB = header[PERSON_B_COL];
  if (!nameA || !nameB) {
    throw new Error(
      `Expected two person columns at positions ${PERSON_A_COL}/${PERSON_B_COL}. ` +
        `Header was: ${header.join(", ")}`
    );
  }

  const emailA = process.env.IMPORT_EMAIL_A ?? `${slug(nameA)}@example.com`;
  const emailB = process.env.IMPORT_EMAIL_B ?? `${slug(nameB)}@example.com`;
  const tempPassword = process.env.IMPORT_PASSWORD ?? "changeme123";
  const groupName = process.env.IMPORT_GROUP_NAME ?? `${nameA} & ${nameB}`;

  // --- Reset: clean slate so the import is reproducible. ---
  await prisma.expenseShare.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.splitConfig.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const personA = await prisma.user.create({
    data: { name: nameA, email: emailA, passwordHash },
  });
  const personB = await prisma.user.create({
    data: { name: nameB, email: emailB, passwordHash },
  });

  const group = await prisma.group.create({
    data: {
      name: groupName,
      members: {
        create: [
          { userId: personA.id, role: "owner" },
          { userId: personB.id, role: "member" },
        ],
      },
    },
  });

  let expenseCount = 0;
  let paymentCount = 0;
  let netACents = 0; // running net check against the export total

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = splitCsvLine(line);
    const date = cols[0]?.trim();
    const description = cols[1]?.trim();
    const category = cols[2]?.trim();
    const cost = cols[3]?.trim();
    const valA = cols[PERSON_A_COL]?.trim();

    if (!date || !description) continue;
    if (description.toLowerCase() === "total balance") continue;

    const aCents = cents(valA);
    netACents += aCents;

    const when = new Date(`${date}T12:00:00`);

    // --- Payment rows -> settlements ---
    if ((category ?? "").toLowerCase() === "payment") {
      const amount = Math.abs(cents(cost)) / 100;
      // A's net rises when A pays B; falls when B pays A.
      const from = aCents > 0 ? personA.id : personB.id;
      const to = aCents > 0 ? personB.id : personA.id;
      await prisma.settlement.create({
        data: { groupId: group.id, fromId: from, toId: to, amount, date: when },
      });
      paymentCount++;
      continue;
    }

    // --- Expense rows -> single payer + exact shares reproducing the nets ---
    const costC = cents(cost);
    // Payer = whoever has the positive net (they fronted the money / are owed).
    // Their own share = cost − positiveNet; the other owes positiveNet.
    const payerIsA = aCents >= 0;
    const positiveNet = Math.abs(aCents);
    const payerId = payerIsA ? personA.id : personB.id;
    const otherId = payerIsA ? personB.id : personA.id;
    const otherShareC = positiveNet;
    const payerShareC = costC - positiveNet;

    await prisma.expense.create({
      data: {
        groupId: group.id,
        description,
        category: category || null,
        amount: costC / 100,
        paidById: payerId,
        date: when,
        shares: {
          create: [
            { userId: payerId, amount: payerShareC / 100 },
            { userId: otherId, amount: otherShareC / 100 },
          ],
        },
      },
    });
    expenseCount++;
  }

  console.log(`Imported ${expenseCount} expenses and ${paymentCount} payments.`);
  console.log(
    `${nameA} net from CSV columns: ${(netACents / 100).toFixed(2)}`
  );

  // Sanity: recompute A's net purely from what we wrote to the DB — should match.
  const shares = await prisma.expenseShare.findMany({
    include: { expense: { select: { paidById: true } } },
  });
  const settlements = await prisma.settlement.findMany();
  let aDb = 0;
  for (const s of shares) {
    if (s.userId === personA.id) aDb -= Math.round(s.amount * 100);
    if (s.expense.paidById === personA.id) aDb += Math.round(s.amount * 100);
  }
  for (const st of settlements) {
    if (st.fromId === personA.id) aDb += Math.round(st.amount * 100);
    if (st.toId === personA.id) aDb -= Math.round(st.amount * 100);
  }
  console.log(
    `${nameA} net recomputed from Splitsy DB: ${(aDb / 100).toFixed(2)}`
  );
  console.log(`Accounts: ${emailA}, ${emailB} (password: set via IMPORT_PASSWORD)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
