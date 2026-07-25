import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signupsEnabled } from "@/lib/config";
import AuthForm from "../(auth)/AuthForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return <AuthForm mode="login" allowSignup={signupsEnabled} />;
}
