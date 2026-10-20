import { FormularioRegistro } from "@/components/formulario-registro";
import { MarcaAcceso } from "@/components/marca-acceso";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function PaginaRegistro() {
  return (
    <MarcaAcceso>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-bold leading-8 text-ink">Crear cuenta</h1>
        <p className="text-sm text-ink-muted">Elige si compras o vendes pescado.</p>
      </div>
      <FormularioRegistro />
    </MarcaAcceso>
  );
}
