import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";
import { newInviteToken } from "@/lib/tokens";
import { sendGroupInviteEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/baseUrl";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await getMembership(id, me.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { email } = parsed.data;

  const group = await prisma.group.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.user.findUnique({ where: { email } });
  const baseUrl = getBaseUrl(req);

  // Existing user → add immediately and notify them.
  if (existing) {
    if (await getMembership(id, existing.id)) {
      return NextResponse.json(
        { error: "That person is already in this group." },
        { status: 409 }
      );
    }
    await prisma.groupMember.create({
      data: { groupId: id, userId: existing.id, role: "member" },
    });
    await sendGroupInviteEmail({
      to: email,
      groupName: group.name,
      inviterName: me.name,
      link: `${baseUrl}/groups/${id}`,
      existingUser: true,
    });
    return NextResponse.json({ status: "added", name: existing.name });
  }

  // New person → create an invite token and email them a join link.
  const { token, expiresAt } = newInviteToken();
  await prisma.groupInvite.create({
    data: {
      token,
      email,
      groupId: id,
      invitedById: me.id,
      expiresAt,
    },
  });
  await sendGroupInviteEmail({
    to: email,
    groupName: group.name,
    inviterName: me.name,
    link: `${baseUrl}/invite/${token}`,
    existingUser: false,
  });
  return NextResponse.json({ status: "invited", email });
}
