import { prisma } from "./prisma";

/** Returns the membership row if the user belongs to the group, else null. */
export async function getMembership(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}
