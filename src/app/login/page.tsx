import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signupsEnabled } from "@/lib/config";
import AuthForm from "../(auth)/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next && next.startsWith("/") ? next : "/dashboard");
  return <AuthForm mode="login" allowSignup={signupsEnabled} next={next} />;
}
