import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeNetBalances } from "@/lib/balances";
import { money } from "@/lib/format";
import TopBar from "../components/TopBar";
import CreateGroup from "./CreateGroup";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      members: { select: { userId: true } },
      expenses: { select: { paidById: true, shares: true } },
      settlements: { select: { fromId: true, toId: true, amount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const summaries = groups.map((g) => {
    const memberIds = g.members.map((m) => m.userId);
    const balances = computeNetBalances(
      memberIds,
      g.expenses.map((e) => ({
        paidById: e.paidById,
        shares: e.shares.map((s) => ({ userId: s.userId, amount: s.amount })),
      })),
      g.settlements
    );
    const mine = balances.find((b) => b.userId === user.id)?.net ?? 0;
    return {
      id: g.id,
      name: g.name,
      memberCount: memberIds.length,
      expenseCount: g.expenses.length,
      net: mine,
    };
  });

  return (
    <>
      <TopBar userName={user.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your groups</h1>
            <p className="text-sm text-muted">
              Track shared expenses with reusable split rules.
            </p>
          </div>
          <CreateGroup />
        </div>

        {summaries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-medium">No groups yet</p>
            <p className="mt-1 text-sm text-muted">
              Create a group to start splitting expenses. A group can be just
              you and one other person.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {summaries.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="block rounded-2xl border border-border bg-surface p-5 transition hover:border-brand hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{g.name}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {g.memberCount}{" "}
                        {g.memberCount === 1 ? "member" : "members"} ·{" "}
                        {g.expenseCount}{" "}
                        {g.expenseCount === 1 ? "expense" : "expenses"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <BalancePill net={g.net} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function BalancePill({ net }: { net: number }) {
  if (Math.abs(net) < 0.005) {
    return <span className="text-sm text-muted">You&apos;re settled up</span>;
  }
  const owed = net > 0;
  return (
    <span
      className={`text-sm font-medium ${owed ? "text-positive" : "text-negative"}`}
    >
      {owed ? "You are owed " : "You owe "}
      {money(Math.abs(net))}
    </span>
  );
}
