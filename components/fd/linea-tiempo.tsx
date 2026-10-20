import { ESTADOS, EstadoPedido } from "@/components/fd/estado-pedido";
import { horaExacta } from "@/lib/formato";
import type { EstadoPedido as Estado, FilaPedidoEvento, Modalidad } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type EventoLinea = Pick<FilaPedidoEvento, "estado" | "nota" | "creado_en"> & {
  actor_id?: string | null;
  /** Nombre de quien dio el paso, si el consumidor lo conoce. Sin actor: "Automático". */
  quien?: string | null;
};

type Props = {
  /** Filas de pedido_eventos, de la más antigua a la más reciente. */
  eventos: EventoLinea[];
  estado: Estado;
  /** Quién mira: cambia la frase de quién debe actuar. */
  papel: "restaurante" | "pescador";
  modalidad?: Modalidad;
};

const CAMINO: Estado[] = ["solicitado", "aceptado", "entregado", "recibido_conforme"];
const FINALES_DISTINTOS: Estado[] = ["rechazado", "cancelado", "con_incidencia"];

// Quién tiene que actuar para llegar a ese paso.
function quienActua(paso: Estado, papel: Props["papel"], modalidad?: Modalidad): string | null {
  const restaurante = papel === "restaurante";
  switch (paso) {
    case "aceptado":
      return restaurante ? "El pescador acepta o rechaza tu pedido." : "Acepta o rechaza el pedido.";
    case "entregado":
      if (modalidad === "recoleccion") {
        return restaurante ? "Recoges en el muelle. Al recibir, confirma." : "El restaurante recoge en el muelle.";
      }
      return restaurante ? "El pescador lo marca al entregar." : "Márcalo como entregado al entregar.";
    case "recibido_conforme":
      return restaurante ? "Revisa el pescado y confirma." : "El restaurante revisa el pescado y confirma.";
    default:
      return null;
  }
}

// resolver_disputa guarda la resolución con el estado con_incidencia y una nota "Resolución: …".
const esResolucion = (e: EventoLinea) => e.estado === "con_incidencia" && !!e.nota?.startsWith("Resolución:");

type Paso = {
  clave: string;
  tipo: "hecho" | "actual" | "pendiente" | "final";
  estado: Estado;
  titulo: string;
  detalle?: string | null;
  quien?: string | null;
  hora?: string;
  nota?: string | null;
};

function armarPasos({ eventos, estado, papel, modalidad }: Props): Paso[] {
  const pasos: Paso[] =
    eventos.length > 0
      ? eventos.map((e, i) => ({
          clave: `e${i}`,
          tipo: FINALES_DISTINTOS.includes(e.estado) && !esResolucion(e) ? "final" : "hecho",
          estado: e.estado,
          titulo: esResolucion(e) ? "Disputa resuelta" : ESTADOS[e.estado].etiqueta,
          quien: e.quien ?? (e.actor_id === null ? "Automático" : null),
          hora: horaExacta(e.creado_en),
          nota: e.nota,
        }))
      : // Sin bitácora: los pasos del camino hasta el estado actual, sin hora.
        CAMINO.slice(0, CAMINO.indexOf(estado) + 1).map((s) => ({
          clave: s,
          tipo: "hecho",
          estado: s,
          titulo: ESTADOS[s].etiqueta,
        }));

  const indice = CAMINO.indexOf(estado);
  if (indice >= 0 && estado !== "recibido_conforme") {
    CAMINO.slice(indice + 1).forEach((s, i) => {
      pasos.push({
        clave: s,
        tipo: i === 0 ? "actual" : "pendiente",
        estado: s,
        titulo: ESTADOS[s].etiqueta,
        detalle: i === 0 ? quienActua(s, papel, modalidad) : null,
      });
    });
  }
  return pasos;
}

/** Los pasos del pedido con quién los dio y a qué hora (hora de Sonora). */
export function LineaTiempo(props: Props) {
  const pasos = armarPasos(props);

  return (
    <ol className="flex flex-col">
      {pasos.map((paso, i) => {
        const ultimo = i === pasos.length - 1;
        const Icono = ESTADOS[paso.estado].icono;
        return (
          <li
            key={paso.clave}
            aria-current={paso.tipo === "actual" ? "step" : undefined}
            className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3"
          >
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  paso.tipo === "hecho" && "bg-fresco text-surface",
                  paso.tipo === "actual" && "border-2 border-boya text-boya",
                  paso.tipo === "pendiente" && "border-2 border-line-strong",
                  paso.tipo === "final" && ESTADOS[paso.estado].clase,
                )}
              >
                {paso.tipo === "hecho" && <Check aria-hidden className="size-4" strokeWidth={3} />}
                {paso.tipo === "actual" && <span aria-hidden className="size-2.5 rounded-full bg-boya" />}
                {paso.tipo === "final" && <Icono aria-hidden className="size-4" />}
              </span>
              {!ultimo && (
                <span
                  aria-hidden
                  className={cn("my-1 w-0.5 flex-1 rounded-full", paso.tipo === "hecho" ? "bg-fresco" : "bg-line")}
                />
              )}
            </div>
            <div className={cn("flex min-w-0 flex-col gap-0.5", !ultimo && "pb-5")}>
              {paso.tipo === "final" ? (
                <EstadoPedido estado={paso.estado} className="self-start" />
              ) : (
                <p className={cn("font-bold leading-7", paso.tipo === "pendiente" ? "text-ink-muted" : "text-ink")}>
                  {paso.titulo}
                  {paso.tipo === "hecho" && <span className="sr-only"> (hecho)</span>}
                  {paso.tipo === "actual" && <span className="sr-only"> (siguiente paso)</span>}
                  {paso.tipo === "pendiente" && <span className="sr-only"> (pendiente)</span>}
                </p>
              )}
              {paso.hora && (
                <p className="text-[13px] text-ink-muted">
                  {paso.quien && `${paso.quien} · `}
                  <span className="font-mono">{paso.hora}</span>
                </p>
              )}
              {paso.detalle && <p className="text-sm text-ink">{paso.detalle}</p>}
              {paso.nota && <p className="text-sm text-ink">{paso.nota}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
