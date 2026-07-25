"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export default function CreateGroup() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create group");
      return;
    }
    setName("");
    setOpen(false);
    router.push(`/groups/${data.group.id}`);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
      >
        <Plus size={16} />
        New group
      </button>
    );
  }

  return (
    <form
      onSubmit={create}
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Apartment, Trip to Lisbon"
        className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-negative">{error}</p>}
    </form>
  );
}
