import { FormularioRegistro } from "@/components/formulario-registro";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function PaginaRegistro() {
  return (
    <div className="mx-auto w-full max-w-md">
      <FormularioRegistro />
    </div>
  );
}
