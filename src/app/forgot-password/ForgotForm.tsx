"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <p className="text-sm text-muted">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a
          link to reset your password. Check your inbox (and spam).
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block text-sm font-medium text-brand-strong"
        >
          ← Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <p className="mb-4 text-sm text-muted">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>
      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-medium">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-strong px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send reset link"}
      </button>
      <Link
        href="/login"
        className="mt-4 block text-center text-sm text-muted transition hover:text-foreground"
      >
        Back to log in
      </Link>
    </form>
  );
}
