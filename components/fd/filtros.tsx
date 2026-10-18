import { Campo, atributosControl, claseControl } from "@/components/fd/campo";
import { HORAS_MAX, PRECIOS_MAX, type Filtros as ValoresFiltros } from "@/lib/filtros-catalogo";
import type { FilaEspecie } from "@/lib/tipos";
import { cn } from "@/lib/utils";

type Props = {
  especies: Pick<FilaEspecie, "id" | "nombre">[];
  /** Los filtros que se ven (en el catálogo, los optimistas de la URL). */
  filtros: ValoresFiltros;
  /** El mecanismo actual decide qué hacer con el cambio (hoy: router.push a la URL). */
  alCambiar: (cambio: Partial<ValoresFiltros>) => void;
  /** Mientras navega a la nueva URL. */
  pendiente?: boolean;
};

// Etiquetas con plantillas fijas (sin Intl): el texto del servidor y el del cliente son idénticos.
const OPCIONES_PRECIO = PRECIOS_MAX.map((p) => ({ valor: String(p), etiqueta: `Hasta $${p}/kg` }));
const OPCIONES_HORAS = HORAS_MAX.map((h) => ({ valor: String(h), etiqueta: `Menos de ${h} h` }));

/**
 * Barra de filtros del catálogo: píldoras de especie y, debajo, precio y horas.
 * Solo presenta; los valores válidos son los de lib/filtros-catalogo.ts.
 */
export function Filtros({ especies, filtros, alCambiar, pendiente }: Props) {
  return (
    <div
      role="group"
      aria-label="Filtros"
      aria-busy={pendiente || undefined}
      className="flex flex-col gap-3 bg-surface-sunken px-4 py-3"
    >
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Pildora activa={filtros.especie == null} onClick={() => alCambiar({ especie: null })}>
          Todas
        </Pildora>
        {especies.map((e) => (
          <Pildora key={e.id} activa={filtros.especie === e.id} onClick={() => alCambiar({ especie: e.id })}>
            {e.nombre}
          </Pildora>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo id="filtro-precio" etiqueta="Precio máximo">
          <select
            {...atributosControl("filtro-precio")}
            value={filtros.precio == null ? "" : String(filtros.precio)}
            onChange={(e) =>
              alCambiar({ precio: PRECIOS_MAX.find((p) => String(p) === e.target.value) ?? null })
            }
            className={cn(claseControl, "w-full cursor-pointer")}
          >
            <option value="">Cualquier precio</option>
            {OPCIONES_PRECIO.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="filtro-horas" etiqueta="Capturado hace">
          <select
            {...atributosControl("filtro-horas")}
            value={filtros.horas == null ? "" : String(filtros.horas)}
            onChange={(e) => alCambiar({ horas: HORAS_MAX.find((h) => String(h) === e.target.value) ?? null })}
            className={cn(claseControl, "w-full cursor-pointer")}
          >
            <option value="">Cualquier hora</option>
            {OPCIONES_HORAS.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </Campo>
      </div>
    </div>
  );
}

// Píldora de 40 px dentro de un área táctil de 44 px.
function Pildora({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className="group flex min-h-11 shrink-0 items-center rounded-full"
    >
      <span
        className={cn(
          "flex min-h-10 items-center whitespace-nowrap rounded-full border px-4 text-sm font-bold transition-colors duration-150",
          activa ? "border-ink bg-ink text-surface" : "border-line-strong bg-surface text-ink group-hover:bg-marea-soft",
        )}
      >
        {children}
      </span>
    </button>
  );
}
