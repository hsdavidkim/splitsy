import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/baseUrl";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  // Always respond the same way — never reveal whether an email is registered.
  if (parsed.success) {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (user) {
      const token = await createToken(user.id, "reset");
      const link = `${getBaseUrl(req)}/reset-password/${token}`;
      await sendPasswordResetEmail(user.email, link);
    }
  }
  return NextResponse.json({ ok: true });
}
