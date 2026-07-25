"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import type { GroupPayload } from "@/lib/types";

export default function MembersPanel({ group }: { group: GroupPayload }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const res = await fetch(`/api/groups/${group.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add member");
      return;
    }
    setNotice("Member added.");
    setEmail("");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-3 text-lg font-semibold">Members</h2>
      <ul className="mb-4 space-y-1.5">
        {group.members.map((m) => (
          <li key={m.userId} className="flex items-center gap-3 text-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold uppercase text-brand-strong">
              {(m.name || "?").slice(0, 2)}
            </span>
            <span className="flex-1">
              {m.userId === group.currentUserId ? "You" : m.name}
              {m.role === "owner" && (
                <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs text-muted">
                  owner
                </span>
              )}
            </span>
            <span className="text-muted">{m.email}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="border-t border-border pt-4">
        <span className="mb-1 block text-sm font-medium">Add a member</span>
        <p className="mb-2 text-xs text-muted">
          They need a Splitsy account. Enter the email they signed up with.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            <UserPlus size={15} />
            {loading ? "Adding…" : "Add"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-negative">{error}</p>}
        {notice && <p className="mt-2 text-sm text-positive">{notice}</p>}
      </form>
    </div>
  );
}
