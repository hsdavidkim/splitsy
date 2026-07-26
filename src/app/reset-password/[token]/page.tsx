import Link from "next/link";
import { peekToken } from "@/lib/tokens";
import AuthShell from "../../(auth)/AuthShell";
import ResetForm from "./ResetForm";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const valid = await peekToken(token, "reset");

  if (!valid) {
    return (
      <AuthShell title="Link expired">
        <p className="text-sm text-muted">
          This password reset link is invalid or has expired. Reset links are
          only valid for one hour.
        </p>
        <Link
          href="/forgot-password"
          className="mt-5 inline-block text-sm font-medium text-brand-strong"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password">
      <ResetForm token={token} />
    </AuthShell>
  );
}
