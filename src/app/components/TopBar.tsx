"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Split, LogOut } from "lucide-react";

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
          className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-brand-strong"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-strong text-white">
            <Split size={16} />
          </span>
          Splitsy
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-muted sm:inline">{userName}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-medium transition hover:bg-background"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
