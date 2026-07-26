import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";

export type TokenType = "verify" | "reset";

const TTL_MS: Record<TokenType, number> = {
  verify: 1000 * 60 * 60 * 24 * 7, // 7 days
  reset: 1000 * 60 * 60, // 1 hour
};

function randomToken(): string {
  return randomBytes(32).toString("hex");
}

/** Create a fresh one-time token for a user, replacing any prior of the same type. */
export async function createToken(
  userId: string,
  type: TokenType
): Promise<string> {
  await prisma.token.deleteMany({ where: { userId, type } });
  const token = randomToken();
  await prisma.token.create({
    data: {
      token,
      type,
      userId,
      expiresAt: new Date(Date.now() + TTL_MS[type]),
    },
  });
  return token;
}

/** Return the userId for a valid, unexpired token of the given type, else null. */
export async function consumeToken(
  token: string,
  type: TokenType
): Promise<string | null> {
  const row = await prisma.token.findUnique({ where: { token } });
  if (!row || row.type !== type) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.token.delete({ where: { id: row.id } }).catch(() => {});
    return null;
  }
  await prisma.token.delete({ where: { id: row.id } }).catch(() => {});
  return row.userId;
}

/** Look up a token without consuming it (for rendering a page before the action). */
export async function peekToken(
  token: string,
  type: TokenType
): Promise<{ userId: string } | null> {
  const row = await prisma.token.findUnique({ where: { token } });
  if (!row || row.type !== type) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return { userId: row.userId };
}

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function newInviteToken(): { token: string; expiresAt: Date } {
  return {
    token: randomToken(),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  };
}
