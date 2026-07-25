import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/access";
import { computeNetBalances, suggestSettlements } from "@/lib/balances";
import type { SplitEntry } from "@/lib/split";
import type { GroupPayload } from "@/lib/types";
import TopBar from "../../components/TopBar";
import GroupClient from "./GroupClient";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await getMembership(id, user.id))) notFound();

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      splitConfigs: { orderBy: { createdAt: "asc" } },
      expenses: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: {
          paidBy: { select: { id: true, name: true } },
          shares: true,
          config: { select: { name: true } },
        },
      },
      settlements: {
        orderBy: { date: "desc" },
        include: {
          from: { select: { id: true, name: true } },
          to: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!group) notFound();

  const nameById = new Map(group.members.map((m) => [m.user.id, m.user.name]));
  const memberIds = group.members.map((m) => m.user.id);

  const balances = computeNetBalances(
    memberIds,
    group.expenses.map((e) => ({
      paidById: e.paidById,
      shares: e.shares.map((s) => ({ userId: s.userId, amount: s.amount })),
    })),
    group.settlements
  );
  const suggestions = suggestSettlements(balances);

  const payload: GroupPayload = {
    id: group.id,
    name: group.name,
    currentUserId: user.id,
    defaultConfigId: group.defaultConfigId,
    members: group.members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    })),
    configs: group.splitConfigs.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      entries: JSON.parse(c.entries) as SplitEntry[],
      isDefault: c.id === group.defaultConfigId,
    })),
    expenses: group.expenses.map((e) => ({
      id: e.id,
      description: e.description,
      category: e.category,
      amount: e.amount,
      paidById: e.paidById,
      paidByName: e.paidBy.name,
      date: e.date.toISOString(),
      configName: e.config?.name ?? null,
      shares: e.shares.map((s) => ({ userId: s.userId, amount: s.amount })),
    })),
    settlements: group.settlements.map((s) => ({
      id: s.id,
      fromId: s.fromId,
      fromName: s.from.name,
      toId: s.toId,
      toName: s.to.name,
      amount: s.amount,
      date: s.date.toISOString(),
    })),
    balances: balances.map((b) => ({
      userId: b.userId,
      name: nameById.get(b.userId) ?? "Unknown",
      net: b.net,
    })),
    suggestions: suggestions.map((s) => ({
      fromId: s.fromId,
      fromName: nameById.get(s.fromId) ?? "Unknown",
      toId: s.toId,
      toName: nameById.get(s.toId) ?? "Unknown",
      amount: s.amount,
    })),
  };

  return (
    <>
      <TopBar userName={user.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
        >
          <ArrowLeft size={15} />
          All groups
        </Link>
        <GroupClient group={payload} />
      </main>
    </>
  );
}
