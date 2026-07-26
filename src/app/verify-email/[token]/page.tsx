import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";
import AuthShell from "../../(auth)/AuthShell";

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const userId = await consumeToken(token, "verify");

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });
  }

  return (
    <AuthShell title={userId ? "Email confirmed" : "Link expired"}>
      {userId ? (
        <div>
          <p className="flex items-center gap-2 text-sm text-positive">
            <CheckCircle2 size={18} />
            Your email is verified. You&apos;re all set.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-block rounded-lg bg-brand-strong px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Go to Splitsy
          </Link>
        </div>
      ) : (
        <div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <XCircle size={18} className="text-negative" />
            This verification link is invalid or has expired.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-block text-sm font-medium text-brand-strong"
          >
            Go to Splitsy
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
