import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await getMembership(id, user.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const invitee = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!invitee) {
    return NextResponse.json(
      { error: "No Splitsy user with that email. Ask them to sign up first." },
      { status: 404 }
    );
  }

  const already = await getMembership(id, invitee.id);
  if (already) {
    return NextResponse.json(
      { error: "That person is already in this group" },
      { status: 409 }
    );
  }

  await prisma.groupMember.create({
    data: { groupId: id, userId: invitee.id, role: "member" },
  });
  return NextResponse.json({ ok: true });
}
