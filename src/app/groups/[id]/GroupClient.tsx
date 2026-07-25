"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import type { GroupPayload } from "@/lib/types";
import AddExpense from "./AddExpense";
import ExpenseList from "./ExpenseList";
import ConfigManager from "./ConfigManager";
import BalancesPanel from "./BalancesPanel";
import MembersPanel from "./MembersPanel";

type Tab = "expenses" | "balances" | "rules" | "members";

const TABS: { key: Tab; label: string }[] = [
  { key: "expenses", label: "Expenses" },
  { key: "balances", label: "Balances" },
  { key: "rules", label: "Split rules" },
  { key: "members", label: "Members" },
];

export default function GroupClient({ group }: { group: GroupPayload }) {
  const [tab, setTab] = useState<Tab>("expenses");

  const yourNet =
    group.balances.find((b) => b.userId === group.currentUserId)?.net ?? 0;
  const settled = Math.abs(yourNet) < 0.005;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">{group.name}</h1>
        <p className="mt-0.5 text-sm">
          {settled ? (
            <span className="text-muted">You&apos;re settled up</span>
          ) : yourNet > 0 ? (
            <span className="text-positive">
              Overall, you are owed {money(yourNet)}
            </span>
          ) : (
            <span className="text-negative">
              Overall, you owe {money(Math.abs(yourNet))}
            </span>
          )}
        </p>
      </div>

      {/* Tab bar — scrollable on small screens */}
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? "bg-brand-strong text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "expenses" && (
        <div className="space-y-4">
          <AddExpense group={group} />
          <ExpenseList group={group} />
        </div>
      )}
      {tab === "balances" && <BalancesPanel group={group} />}
      {tab === "rules" && <ConfigManager group={group} />}
      {tab === "members" && <MembersPanel group={group} />}
    </div>
  );
}
