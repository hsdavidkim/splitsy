import Link from "next/link";
import { Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getValidInvite } from "@/lib/invites";
import AuthShell from "../../(auth)/AuthShell";
import InviteActions from "./InviteActions";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getValidInvite(token);
  const me = await getCurrentUser();

  if (!invite) {
    return (
      <AuthShell title="Invitation not found">
        <p className="text-sm text-muted">
          This invitation is invalid, has already been used, or has expired.
          Ask whoever invited you to send a new one.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block text-sm font-medium text-brand-strong"
        >
          Go to Splitsy
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={`Join ${invite.group.name}`}>
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand-strong">
          <Users size={18} />
        </span>
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">
            {invite.invitedBy.name}
          </span>{" "}
          invited you to split expenses in{" "}
          <span className="font-medium text-foreground">
            {invite.group.name}
          </span>
          .
        </p>
      </div>
      <InviteActions token={token} email={invite.email} loggedIn={!!me} />
    </AuthShell>
  );
}
