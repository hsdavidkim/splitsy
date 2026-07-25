import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";

const schema = z.object({
  fromId: z.string().min(1),
  toId: z.string().min(1),
  amount: z.number().positive("Amount must be greater than 0"),
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
  const { fromId, toId, amount } = parsed.data;
  if (fromId === toId) {
    return NextResponse.json(
      { error: "Payer and recipient must differ" },
      { status: 400 }
    );
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    select: { userId: true },
  });
  const memberIds = new Set(members.map((m) => m.userId));
  if (!memberIds.has(fromId) || !memberIds.has(toId)) {
    return NextResponse.json(
      { error: "Both parties must be group members" },
      { status: 400 }
    );
  }

  await prisma.settlement.create({
    data: { groupId: id, fromId, toId, amount },
  });
  return NextResponse.json({ ok: true });
}
