import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signupsEnabled } from "@/lib/config";
import AuthForm from "../(auth)/AuthForm";

export default async function SignupPage() {
  // Sign-ups closed: don't expose the form even via a direct /signup visit.
  if (!signupsEnabled) redirect("/login");
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return <AuthForm mode="signup" allowSignup />;
}
