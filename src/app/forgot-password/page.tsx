import AuthShell from "../(auth)/AuthShell";
import ForgotForm from "./ForgotForm";

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Forgot your password?">
      <ForgotForm />
    </AuthShell>
  );
}
