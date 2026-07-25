import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await getMembership(id, user.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      splitConfigs: { orderBy: { createdAt: "asc" } },
      expenses: {
        orderBy: { date: "desc" },
        include: {
          paidBy: { select: { id: true, name: true } },
          shares: true,
          config: { select: { id: true, name: true } },
        },
      },
      settlements: {
        orderBy: { date: "desc" },
        include: {
          from: { select: { id: true, name: true } },
          to: { select: { id: true, name: true } },
        },
      },
    },
  });
  return NextResponse.json({ group });
}

const patchSchema = z.object({
  defaultConfigId: z.string().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await getMembership(id, user.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { defaultConfigId } = parsed.data;

  if (defaultConfigId) {
    const cfg = await prisma.splitConfig.findFirst({
      where: { id: defaultConfigId, groupId: id },
    });
    if (!cfg)
      return NextResponse.json({ error: "Config not found" }, { status: 400 });
  }

  await prisma.group.update({
    where: { id },
    data: { defaultConfigId },
  });
  return NextResponse.json({ ok: true });
}
