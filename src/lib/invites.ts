import "server-only";
import { prisma } from "./prisma";

/** A pending invite that's still valid (exists, not accepted, not expired). */
export async function getValidInvite(token: string) {
  const invite = await prisma.groupInvite.findUnique({
    where: { token },
    include: {
      group: { select: { id: true, name: true } },
      invitedBy: { select: { name: true } },
    },
  });
  if (!invite) return null;
  if (invite.acceptedAt) return null;
  if (invite.expiresAt.getTime() < Date.now()) return null;
  return invite;
}

/** Add a user to the invite's group (idempotent) and mark the invite accepted. */
export async function acceptInvite(token: string, userId: string) {
  const invite = await getValidInvite(token);
  if (!invite) return null;

  const already = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: invite.groupId, userId } },
  });
  if (!already) {
    await prisma.groupMember.create({
      data: { groupId: invite.groupId, userId, role: "member" },
    });
  }
  await prisma.groupInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });
  return invite.group;
}
