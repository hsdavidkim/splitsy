"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateConfig, SplitType, SplitEntry } from "@/lib/split";
import { splitTypeLabel } from "@/lib/format";
import type { GroupPayload } from "@/lib/types";

export default function ConfigManager({ group }: { group: GroupPayload }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function setDefault(configId: string | null) {
    await fetch(`/api/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultConfigId: configId }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Split rules</h2>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="rounded-lg bg-brand-strong px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              + New rule
            </button>
          )}
        </div>
        <p className="mb-4 text-sm text-muted">
          Save a split once (e.g. a 60/40 rent split) and reuse it. Set one as
          the group default and it auto-applies to every new expense.
        </p>

        {group.configs.length === 0 ? (
          <p className="text-sm text-muted">
            No saved rules yet. New expenses split equally until you add one.
          </p>
        ) : (
          <ul className="space-y-2">
            {group.configs.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-border bg-background p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      {c.isDefault && (
                        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand-strong">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {splitTypeLabel(c.type)}
                    </div>
                  </div>
                  {c.isDefault ? (
                    <button
                      onClick={() => setDefault(null)}
                      className="text-xs text-muted transition hover:text-foreground"
                    >
                      Unset default
                    </button>
                  ) : (
                    <button
                      onClick={() => setDefault(c.id)}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs transition hover:bg-surface"
                    >
                      Make default
                    </button>
                  )}
                </div>
                {c.type !== "equal" && c.entries.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                    {c.entries.map((e) => {
                      const m = group.members.find((x) => x.userId === e.userId);
                      const suffix =
                        c.type === "percentage"
                          ? "%"
                          : c.type === "exact"
                          ? " $"
                          : "×";
                      return (
                        <li key={e.userId}>
                          {m?.name ?? "—"}:{" "}
                          {c.type === "exact"
                            ? `$${e.value}`
                            : `${e.value}${suffix}`}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {creating && (
        <NewConfig group={group} onClose={() => setCreating(false)} />
      )}
    </div>
  );
}

function NewConfig({
  group,
  onClose,
}: {
  group: GroupPayload;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<SplitType>("percentage");
  const [values, setValues] = useState<Record<string, string>>({});
  const [makeDefault, setMakeDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function buildEntries(): SplitEntry[] {
    return group.members
      .map((m) => ({
        userId: m.userId,
        value: parseFloat(values[m.userId] ?? "") || 0,
      }))
      .filter((e) => e.value > 0);
  }

  const liveError =
    type === "equal" ? null : validateConfig(type, buildEntries());

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Give the rule a name");
    const entries = type === "equal" ? [] : buildEntries();
    const err = validateConfig(type, entries);
    if (err) return setError(err);

    setLoading(true);
    const res = await fetch(`/api/groups/${group.id}/configs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, entries, makeDefault }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save rule");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <form
      onSubmit={save}
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h3 className="mb-4 font-semibold">New split rule</h3>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 60/40 rent"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </label>

      <div className="mb-3">
        <span className="mb-1 block text-sm font-medium">Type</span>
        <div className="flex flex-wrap gap-2 text-sm">
          {(["equal", "percentage", "shares", "exact"] as SplitType[]).map(
            (t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`rounded-lg border px-3 py-1 transition ${
                  type === t
                    ? "border-brand bg-brand/10 text-brand-strong"
                    : "border-border text-muted"
                }`}
              >
                {splitTypeLabel(t)}
              </button>
            )
          )}
        </div>
      </div>

      {type !== "equal" && (
        <div className="mb-3 grid gap-2">
          {group.members.map((m) => (
            <div key={m.userId} className="flex items-center gap-2">
              <span className="flex-1 text-sm">{m.name}</span>
              <input
                inputMode="decimal"
                value={values[m.userId] ?? ""}
                onChange={(e) =>
                  setValues({ ...values, [m.userId]: e.target.value })
                }
                placeholder={
                  type === "percentage" ? "%" : type === "exact" ? "$" : "weight"
                }
                className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-right outline-none focus:border-brand"
              />
            </div>
          ))}
          {liveError && (
            <p className="text-xs text-negative">{liveError}</p>
          )}
        </div>
      )}

      <label className="mb-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(e) => setMakeDefault(e.target.checked)}
          className="h-4 w-4 accent-[var(--brand-strong)]"
        />
        Make this the group default (auto-applies to new expenses)
      </label>

      {error && <p className="mb-3 text-sm text-negative">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save rule"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
