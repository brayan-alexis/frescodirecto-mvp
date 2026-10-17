import { UpdatePasswordForm } from "@/components/update-password-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <UpdatePasswordForm />
    </div>
  );
}
