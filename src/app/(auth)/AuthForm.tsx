"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthForm({
  mode,
  allowSignup,
}: {
  mode: "login" | "signup";
  allowSignup: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignup ? { name, email, password } : { email, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — please try again");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold tracking-tight text-brand-strong">
            Splitsy
          </div>
          <p className="mt-1 text-sm text-muted">
            Modular expense splitting for real life.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
        >
          <h1 className="mb-5 text-lg font-semibold">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>

          {isSignup && (
            <Field
              label="Name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Alex Rivera"
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={isSignup ? "At least 6 characters" : "••••••••"}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />

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
            {loading
              ? "Please wait…"
              : isSignup
              ? "Create account"
              : "Log in"}
          </button>
        </form>

        {allowSignup && (
          <p className="mt-4 text-center text-sm text-muted">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-brand-strong">
                  Log in
                </Link>
              </>
            ) : (
              <>
                New to Splitsy?{" "}
                <Link href="/signup" className="font-medium text-brand-strong">
                  Create an account
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
