import { ForgotPasswordForm } from "@/components/forgot-password-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <ForgotPasswordForm />
    </div>
  );
}
