"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { money, shortDate } from "@/lib/format";
import type { GroupPayload } from "@/lib/types";

export default function ExpenseList({ group }: { group: GroupPayload }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const nameOf = (id: string) =>
    id === group.currentUserId
      ? "You"
      : group.members.find((m) => m.userId === id)?.name ?? "Unknown";

  async function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    setDeleting(id);
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  if (group.expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
        No expenses yet. Add your first one above.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-3 text-lg font-semibold">Expenses</h2>
      <ul className="divide-y divide-border">
        {group.expenses.map((e) => {
          const yourShare = e.shares.find(
            (s) => s.userId === group.currentUserId
          )?.amount;
          return (
            <li key={e.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{e.description}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span>
                      {nameOf(e.paidById)} paid · {shortDate(e.date)}
                    </span>
                    {e.category && (
                      <span className="rounded-full bg-background px-2 py-0.5">
                        {e.category}
                      </span>
                    )}
                    {e.configName && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-brand-strong">
                        {e.configName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-semibold">{money(e.amount)}</div>
                  {yourShare !== undefined && (
                    <div className="text-xs text-muted">
                      your share {money(yourShare)}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <ul className="flex flex-wrap gap-x-3 text-xs text-muted">
                  {e.shares.map((s) => (
                    <li key={s.userId}>
                      {s.userId === group.currentUserId
                        ? "You"
                        : nameOf(s.userId)}
                      : {money(s.amount)}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => remove(e.id)}
                  disabled={deleting === e.id}
                  className="shrink-0 text-xs text-muted transition hover:text-negative disabled:opacity-50"
                >
                  {deleting === e.id ? "…" : "Delete"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
