import { Cargando } from "@/components/cargando";
import { FormularioLogin } from "@/components/formulario-login";
import { Suspense } from "react";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function PaginaLogin({ searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-sm">
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Lee `next` en el servidor para que el formulario llegue ya pintado en el HTML.
async function Contenido({ searchParams }: Props) {
  const { next } = await searchParams;
  return <FormularioLogin siguiente={typeof next === "string" ? next : null} />;
}
