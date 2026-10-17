import { ESTADOS_PEDIDO } from "@/components/estado-pedido";
import { horaSonora } from "@/lib/formato";
import type { FilaPedidoEvento } from "@/lib/tipos";

export type EventoPedido = Pick<FilaPedidoEvento, "estado" | "nota" | "actor_id" | "creado_en">;

/**
 * resolver_disputa guarda la resolución con el estado con_incidencia (el pedido no cambia)
 * y una nota que empieza con "Resolución:"; así no se repite "Con incidencia".
 */
function nombreDe(evento: EventoPedido): string {
  if (evento.estado === "con_incidencia" && evento.nota?.startsWith("Resolución:")) return "Disputa resuelta";
  return ESTADOS_PEDIDO[evento.estado].nombre;
}

/** Bitácora del pedido. Las notas ya explican los movimientos de dinero. */
export function LineaTiempo({ eventos }: { eventos: EventoPedido[] }) {
  return (
    <section aria-labelledby="titulo-linea-tiempo" className="flex flex-col gap-3 rounded-xl border p-3">
      <h2 id="titulo-linea-tiempo" className="text-lg font-semibold">
        Línea de tiempo
      </h2>
      {eventos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay pasos registrados.</p>
      ) : (
        <ol className="flex flex-col gap-3 border-l-2 pl-4 text-sm">
          {eventos.map((evento, i) => (
            <li key={i} className="flex flex-col gap-0.5">
              <p className="font-semibold">{nombreDe(evento)}</p>
              <p className="text-muted-foreground">
                {horaSonora(evento.creado_en)}
                {evento.actor_id == null && " · Automático"}
              </p>
              {evento.nota && <p>{evento.nota}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
