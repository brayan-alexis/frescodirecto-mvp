"use client";

import { HORAS_MAX, PRECIOS_MAX, urlCatalogo, type Filtros } from "@/lib/filtros-catalogo";
import type { FilaEspecie } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

type Opcion = { valor: string; etiqueta: string };

type Props = {
  especies: Pick<FilaEspecie, "id" | "nombre">[];
  filtros: Filtros;
  children: React.ReactNode;
};

// Etiquetas con plantillas fijas (sin Intl): el texto del servidor y el del cliente son idénticos.
const OPCIONES_PRECIO: Opcion[] = PRECIOS_MAX.map((p) => ({ valor: String(p), etiqueta: `Hasta $${p}/kg` }));
const OPCIONES_HORAS: Opcion[] = HORAS_MAX.map((h) => ({ valor: String(h), etiqueta: `Menos de ${h} h` }));

/** Chips de filtro (Especie, Precio, Horas) que guardan la elección en la URL, más la lista que filtran. */
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
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Filtros" className="flex flex-wrap gap-2">
        <Chip
          nombre="Especie"
          etiquetaAccesible="Filtrar por especie"
          textoTodas="Todas las especies"
          valor={vista.especie == null ? "" : String(vista.especie)}
          opciones={especies.map((e) => ({ valor: String(e.id), etiqueta: e.nombre }))}
          alCambiar={(v) => cambiar({ especie: v ? Number(v) : null })}
        />
        <Chip
          nombre="Precio"
          etiquetaAccesible="Filtrar por precio máximo por kg"
          textoTodas="Cualquier precio"
          valor={vista.precio == null ? "" : String(vista.precio)}
          opciones={OPCIONES_PRECIO}
          alCambiar={(v) => cambiar({ precio: PRECIOS_MAX.find((p) => String(p) === v) ?? null })}
        />
        <Chip
          nombre="Horas"
          etiquetaAccesible="Filtrar por horas desde la captura"
          textoTodas="Cualquier hora"
          valor={vista.horas == null ? "" : String(vista.horas)}
          opciones={OPCIONES_HORAS}
          alCambiar={(v) => cambiar({ horas: HORAS_MAX.find((h) => String(h) === v) ?? null })}
        />
      </div>
      <div aria-busy={pendiente} className={cn("transition-opacity", pendiente && "opacity-60")}>
        {children}
      </div>
    </div>
  );
}

type PropsChip = {
  nombre: string;
  etiquetaAccesible: string;
  textoTodas: string;
  valor: string;
  opciones: Opcion[];
  alCambiar: (valor: string) => void;
};

// Píldora con un <select> nativo invisible encima: en el teléfono abre el selector del sistema.
function Chip({ nombre, etiquetaAccesible, textoTodas, valor, opciones, alCambiar }: PropsChip) {
  const elegida = opciones.find((o) => o.valor === valor);

  return (
    <label
      className={cn(
        "relative inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full border px-4 text-sm font-medium focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        elegida ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
      )}
    >
      <span aria-hidden>{elegida ? elegida.etiqueta : nombre}</span>
      <ChevronDown aria-hidden className="size-4" />
      <select
        aria-label={etiquetaAccesible}
        value={elegida ? valor : ""}
        onChange={(e) => alCambiar(e.target.value)}
        // 16 px: con menos, Safari de iPhone hace zoom al tocar el chip.
        className="absolute inset-0 cursor-pointer text-base opacity-0"
      >
        <option value="">{textoTodas}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}
