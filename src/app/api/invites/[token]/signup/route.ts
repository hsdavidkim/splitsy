import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { getValidInvite, acceptInvite } from "@/lib/invites";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Create an account straight from an invite (bypasses ALLOW_SIGNUPS — the
// invite itself is the authorization) and join the group in one step.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await getValidInvite(token);
  if (!invite) {
    return NextResponse.json(
      { error: "This invitation is invalid or has expired." },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { name, password } = parsed.data;

  // The invite is addressed to a specific email; use it (verified by delivery).
  const existing = await prisma.user.findUnique({
    where: { email: invite.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please log in." },
      { status: 409 }
    );
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: invite.email,
      passwordHash: await hashPassword(password),
      emailVerified: new Date(),
    },
    select: { id: true },
  });

  const group = await acceptInvite(token, user.id);
  await createSession(user.id);
  return NextResponse.json({ ok: true, groupId: group?.id });
}
