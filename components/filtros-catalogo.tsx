"use client";

import { Filtros as BarraFiltros } from "@/components/fd/filtros";
import { urlCatalogo, type Filtros } from "@/lib/filtros-catalogo";
import type { FilaEspecie } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

type Props = {
  especies: Pick<FilaEspecie, "id" | "nombre">[];
  filtros: Filtros;
  children: React.ReactNode;
};

/** Barra de filtros que guarda la elección en la URL, más la lista que filtran. */
export function FiltrosCatalogo({ especies, filtros, children }: Props) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [vista, setVista] = useOptimistic(filtros);

  function cambiar(cambio: Partial<Filtros>) {
    const nuevos = { ...vista, ...cambio };
    startTransition(() => {
      setVista(nuevos);
      router.push(urlCatalogo(nuevos), { scroll: false });
    });
  }

  return (
    <div className="flex flex-col">
      {/* De orilla a orilla: compensa el px-4 de <main>. */}
      <div className="-mx-4">
        <BarraFiltros especies={especies} filtros={vista} alCambiar={cambiar} pendiente={pendiente} />
      </div>
      <div aria-busy={pendiente} className={cn("pt-4 transition-opacity", pendiente && "opacity-60")}>
        {children}
      </div>
    </div>
  );
}
