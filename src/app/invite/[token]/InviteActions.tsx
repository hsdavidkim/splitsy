"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InviteActions({
  token,
  email,
  loggedIn,
}: {
  token: string;
  email: string;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function go(url: string, body?: object) {
    setError(null);
    setLoading(true);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }
    router.push(data.groupId ? `/groups/${data.groupId}` : "/dashboard");
    router.refresh();
  }

  if (loggedIn) {
    return (
      <div>
        {error && <p className="mb-3 text-sm text-negative">{error}</p>}
        <button
          onClick={() => go(`/api/invites/${token}/accept`)}
          disabled={loading}
          className="w-full rounded-lg bg-brand-strong px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Joining…" : "Accept invitation"}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(`/api/invites/${token}/signup`, { name, password });
      }}
    >
      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-medium">Email</span>
        <input
          value={email}
          disabled
          className="w-full cursor-not-allowed rounded-lg border border-border bg-background px-3 py-2.5 text-muted"
        />
      </label>
      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-medium">Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jordan Lee"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </label>
      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-medium">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          autoComplete="new-password"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </label>
      {error && (
        <p className="mb-3 rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-strong px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Joining…" : "Join the group"}
      </button>
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href={`/login?next=/invite/${token}`}
          className="font-medium text-brand-strong"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
