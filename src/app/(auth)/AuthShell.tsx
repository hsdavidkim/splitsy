import { Split } from "lucide-react";

/** Centered branded card used by the auth-adjacent pages (reset, invite, etc.). */
export default function AuthShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 flex justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-strong text-white shadow-sm">
              <Split size={24} />
            </span>
          </div>
          <div className="text-3xl font-bold tracking-tight text-brand-strong">
            Splitsy
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="mb-5 text-lg font-semibold">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
