"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  computeSplit,
  validateConfig,
  SplitType,
  SplitEntry,
} from "@/lib/split";
import { money } from "@/lib/format";
import type { GroupPayload } from "@/lib/types";

type Mode = "equal" | "custom" | string; // string = saved config id

export default function AddExpense({ group }: { group: GroupPayload }) {
  const router = useRouter();
  const members = group.members;

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState(group.currentUserId);
  // Default the split mode to the group's saved default config when present.
  const [mode, setMode] = useState<Mode>(group.defaultConfigId ?? "equal");

  // Equal-split participant selection.
  const [equalParticipants, setEqualParticipants] = useState<Set<string>>(
    new Set(members.map((m) => m.userId))
  );

  // Custom one-off split.
  const [customType, setCustomType] = useState<SplitType>("percentage");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const amountNum = parseFloat(amount) || 0;

  // Build the split shape + participant list for whatever mode is active.
  const { shape, participants, validationError } = useMemo(() => {
    if (mode === "equal") {
      const parts = members
        .map((m) => m.userId)
        .filter((id) => equalParticipants.has(id));
      return {
        shape: { type: "equal" as SplitType, entries: [] as SplitEntry[] },
        participants: parts,
        validationError:
          parts.length === 0 ? "Pick at least one person" : null,
      };
    }
    if (mode === "custom") {
      const entries: SplitEntry[] = members
        .map((m) => ({
          userId: m.userId,
          value: parseFloat(customValues[m.userId] ?? "") || 0,
        }))
        .filter((e) => e.value > 0);
      const err = validateConfig(customType, entries);
      return {
        shape: { type: customType, entries },
        participants: members.map((m) => m.userId),
        validationError: err,
      };
    }
    // Saved config.
    const cfg = group.configs.find((c) => c.id === mode);
    if (!cfg) {
      return {
        shape: { type: "equal" as SplitType, entries: [] },
        participants: members.map((m) => m.userId),
        validationError: "Configuration not found",
      };
    }
    return {
      shape: { type: cfg.type as SplitType, entries: cfg.entries },
      participants: members.map((m) => m.userId),
      validationError: null,
    };
  }, [mode, members, equalParticipants, customType, customValues, group.configs]);

  const preview = useMemo(() => {
    if (amountNum <= 0 || validationError) return [];
    try {
      return computeSplit(amountNum, shape, participants);
    } catch {
      return [];
    }
  }, [amountNum, shape, participants, validationError]);

  const nameOf = (userId: string) =>
    members.find((m) => m.userId === userId)?.name ?? "Unknown";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (amountNum <= 0) return setError("Enter an amount greater than 0");
    if (validationError) return setError(validationError);

    setLoading(true);
    const body: Record<string, unknown> = {
      description,
      category: category.trim() || undefined,
      amount: amountNum,
      paidById,
    };
    if (mode === "equal") {
      body.participantIds = participants;
    } else if (mode === "custom") {
      body.inline = shape;
    } else {
      body.configId = mode;
    }

    const res = await fetch(`/api/groups/${group.id}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add expense");
      return;
    }
    setDescription("");
    setCategory("");
    setAmount("");
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 className="mb-4 text-lg font-semibold">Add an expense</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Groceries, Rent"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Amount</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Category <span className="text-muted">(optional)</span>
          </span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Groceries, Pets"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Paid by</span>
          <select
            value={paidById}
            onChange={(e) => setPaidById(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.userId === group.currentUserId ? "You" : m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <span className="mb-1 block text-sm font-medium">Split using</span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        >
          <option value="equal">Equal split</option>
          {group.configs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isDefault ? " (default)" : ""}
            </option>
          ))}
          <option value="custom">Custom one-off split…</option>
        </select>
      </div>

      {/* Equal-split participant picker */}
      {mode === "equal" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {members.map((m) => {
            const on = equalParticipants.has(m.userId);
            return (
              <button
                type="button"
                key={m.userId}
                onClick={() => {
                  const next = new Set(equalParticipants);
                  if (on) next.delete(m.userId);
                  else next.add(m.userId);
                  setEqualParticipants(next);
                }}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  on
                    ? "border-brand bg-brand/10 text-brand-strong"
                    : "border-border text-muted"
                }`}
              >
                {m.userId === group.currentUserId ? "You" : m.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Custom one-off split editor */}
      {mode === "custom" && (
        <div className="mt-3 rounded-xl border border-border bg-background p-3">
          <div className="mb-3 flex gap-2 text-sm">
            {(["percentage", "shares", "exact"] as SplitType[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setCustomType(t)}
                className={`rounded-lg border px-3 py-1 capitalize transition ${
                  customType === t
                    ? "border-brand bg-brand/10 text-brand-strong"
                    : "border-border text-muted"
                }`}
              >
                {t === "exact" ? "Exact $" : t}
              </button>
            ))}
          </div>
          <div className="grid gap-2">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center gap-2">
                <span className="flex-1 text-sm">
                  {m.userId === group.currentUserId ? "You" : m.name}
                </span>
                <input
                  inputMode="decimal"
                  value={customValues[m.userId] ?? ""}
                  onChange={(e) =>
                    setCustomValues({
                      ...customValues,
                      [m.userId]: e.target.value,
                    })
                  }
                  placeholder={
                    customType === "percentage"
                      ? "%"
                      : customType === "exact"
                      ? "$"
                      : "weight"
                  }
                  className="w-24 rounded-lg border border-border bg-surface px-2 py-1 text-right outline-none focus:border-brand"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live preview */}
      {amountNum > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-background p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Preview
          </div>
          {validationError ? (
            <p className="text-sm text-negative">{validationError}</p>
          ) : preview.length === 0 ? (
            <p className="text-sm text-muted">Enter split details…</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {preview.map((p) => (
                <li key={p.userId} className="flex justify-between">
                  <span>
                    {p.userId === group.currentUserId ? "You" : nameOf(p.userId)}
                  </span>
                  <span className="font-medium">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-negative">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-brand-strong px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Adding…" : "Add expense"}
      </button>
    </form>
  );
}
