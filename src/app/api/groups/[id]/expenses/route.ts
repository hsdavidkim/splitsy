import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";
import { computeSplit, SplitConfigShape, SplitEntry } from "@/lib/split";

const schema = z.object({
  description: z.string().trim().min(1, "Description is required").max(120),
  category: z.string().trim().max(60).optional(),
  amount: z.number().positive("Amount must be greater than 0"),
  paidById: z.string().min(1),
  // Either reference a saved config, or provide an inline split.
  configId: z.string().nullable().optional(),
  // Optional inline override; when omitted and configId given, config is used.
  inline: z
    .object({
      type: z.enum(["equal", "percentage", "shares", "exact"]),
      entries: z.array(z.object({ userId: z.string(), value: z.number() })),
    })
    .optional(),
  // Participants to split among (defaults to all members).
  participantIds: z.array(z.string()).optional(),
  date: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await getMembership(id, user.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const {
    description,
    category,
    amount,
    paidById,
    configId,
    inline,
    participantIds,
    date,
  } = parsed.data;

  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    select: { userId: true },
  });
  const memberIds = members.map((m) => m.userId);

  if (!memberIds.includes(paidById)) {
    return NextResponse.json(
      { error: "Payer must be a group member" },
      { status: 400 }
    );
  }

  // Resolve the split configuration: inline override > saved config > equal.
  let shape: SplitConfigShape;
  let usedConfigId: string | null = null;

  if (inline) {
    shape = { type: inline.type, entries: inline.entries as SplitEntry[] };
  } else if (configId) {
    const cfg = await prisma.splitConfig.findFirst({
      where: { id: configId, groupId: id },
    });
    if (!cfg)
      return NextResponse.json({ error: "Config not found" }, { status: 400 });
    shape = {
      type: cfg.type as SplitConfigShape["type"],
      entries: JSON.parse(cfg.entries) as SplitEntry[],
    };
    usedConfigId = cfg.id;
  } else {
    shape = { type: "equal", entries: [] };
  }

  const participants =
    participantIds && participantIds.length > 0
      ? participantIds.filter((p) => memberIds.includes(p))
      : memberIds;

  const computed = computeSplit(amount, shape, participants);
  if (computed.length === 0) {
    return NextResponse.json(
      { error: "Split produced no participants" },
      { status: 400 }
    );
  }

  const expense = await prisma.expense.create({
    data: {
      groupId: id,
      description,
      category: category || null,
      amount,
      paidById,
      configId: usedConfigId,
      date: date ? new Date(date) : undefined,
      shares: {
        create: computed.map((c) => ({ userId: c.userId, amount: c.amount })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ expense });
}
