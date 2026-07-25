import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";
import { validateConfig } from "@/lib/split";

const schema = z.object({
  name: z.string().trim().min(1, "Give the configuration a name").max(60),
  type: z.enum(["equal", "percentage", "shares", "exact"]),
  entries: z
    .array(
      z.object({
        userId: z.string(),
        value: z.number(),
      })
    )
    .default([]),
  makeDefault: z.boolean().optional(),
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
  const { name, type, entries, makeDefault } = parsed.data;

  // Only allow entries for actual group members.
  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    select: { userId: true },
  });
  const memberIds = new Set(members.map((m) => m.userId));
  const cleanEntries = entries.filter((e) => memberIds.has(e.userId));

  const err = validateConfig(type, cleanEntries);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const config = await prisma.splitConfig.create({
    data: {
      groupId: id,
      name,
      type,
      entries: JSON.stringify(cleanEntries),
    },
    select: { id: true },
  });

  if (makeDefault) {
    await prisma.group.update({
      where: { id },
      data: { defaultConfigId: config.id },
    });
  }

  return NextResponse.json({ config });
}
