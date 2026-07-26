import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { acceptInvite } from "@/lib/invites";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const group = await acceptInvite(token, me.id);
  if (!group) {
    return NextResponse.json(
      { error: "This invitation is invalid or has expired." },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, groupId: group.id });
}
