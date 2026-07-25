"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TopBar({ userName }: { userName: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link
          href="/dashboard"
          className="text-lg font-bold tracking-tight text-brand-strong"
        >
          Splitsy
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-muted sm:inline">{userName}</span>
          <button
            onClick={logout}
            className="rounded-lg border border-border px-3 py-1.5 font-medium transition hover:bg-background"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
