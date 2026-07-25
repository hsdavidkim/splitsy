"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { money, shortDate } from "@/lib/format";
import type { GroupPayload } from "@/lib/types";

export default function BalancesPanel({ group }: { group: GroupPayload }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const you = (id: string) =>
    id === group.currentUserId
      ? "You"
      : group.members.find((m) => m.userId === id)?.name ?? "Unknown";

  async function recordSettlement(fromId: string, toId: string, amount: number) {
    setBusy(`${fromId}-${toId}`);
    await fetch(`/api/groups/${group.id}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromId, toId, amount }),
    });
    setBusy(null);
    router.refresh();
  }

  const settled = group.balances.every((b) => Math.abs(b.net) < 0.005);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold">Balances</h2>
        <ul className="space-y-1.5">
          {group.balances.map((b) => {
            const zero = Math.abs(b.net) < 0.005;
            const owed = b.net > 0;
            return (
              <li key={b.userId} className="flex items-center justify-between">
                <span className="text-sm">
                  {b.userId === group.currentUserId ? "You" : b.name}
                </span>
                <span
                  className={`text-sm font-medium ${
                    zero
                      ? "text-muted"
                      : owed
                      ? "text-positive"
                      : "text-negative"
                  }`}
                >
                  {zero
                    ? "settled"
                    : owed
                    ? `is owed ${money(b.net)}`
                    : `owes ${money(Math.abs(b.net))}`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold">Settle up</h2>
        {settled || group.suggestions.length === 0 ? (
          <p className="text-sm text-muted">Everyone&apos;s square. 🎉</p>
        ) : (
          <ul className="space-y-2">
            {group.suggestions.map((s) => {
              const key = `${s.fromId}-${s.toId}`;
              return (
                <li
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background p-3"
                >
                  <span className="text-sm">
                    <span className="font-medium">{you(s.fromId)}</span>{" "}
                    {s.fromId === group.currentUserId ? "pay" : "pays"}{" "}
                    <span className="font-medium">{you(s.toId)}</span>{" "}
                    <span className="font-semibold">{money(s.amount)}</span>
                  </span>
                  <button
                    disabled={busy === key}
                    onClick={() =>
                      recordSettlement(s.fromId, s.toId, s.amount)
                    }
                    className="shrink-0 rounded-lg bg-brand-strong px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {busy === key ? "…" : "Record"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {group.settlements.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold">Payment history</h2>
          <ul className="space-y-1.5 text-sm">
            {group.settlements.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>
                  {you(s.fromId)} → {you(s.toId)}
                </span>
                <span className="text-muted">
                  {money(s.amount)} · {shortDate(s.date)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
