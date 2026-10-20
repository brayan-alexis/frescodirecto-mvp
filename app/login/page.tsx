import { AvisoAcceso } from "@/components/aviso-acceso";
import { Cargando } from "@/components/cargando";
import { FormularioLogin } from "@/components/formulario-login";
import { MarcaAcceso } from "@/components/marca-acceso";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Entrar" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function PaginaLogin({ searchParams }: Props) {
  return (
    <MarcaAcceso>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-bold leading-8 text-ink">Entrar</h1>
        <p className="text-sm text-ink-muted">Usa el correo y la contraseña de tu cuenta.</p>
      </div>
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </MarcaAcceso>
  );
}

// Lee `next` en el servidor para que el formulario llegue ya pintado en el HTML.
async function Contenido({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <>
      {/* Acceso denegado (?aviso=acceso) que manda exigirRol al pedir una sección protegida. */}
      <AvisoAcceso enFormulario />
      <FormularioLogin siguiente={typeof next === "string" ? next : null} />
    </>
  );
}
