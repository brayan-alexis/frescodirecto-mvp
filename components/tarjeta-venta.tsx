import { AccionesDe, TelefonoContraparte, montoPescador } from "@/components/fila-pedido";
import { textoPago } from "@/components/estado-pedido";
import { EstadoPedido } from "@/components/fd/estado-pedido";
import { formatoDinero, formatoKg, horaSonora, horasDesde } from "@/lib/formato";
import { reglaDe24h } from "@/lib/seguimiento";
import type { MiPedido, Modalidad } from "@/lib/tipos";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

type Props = {
  /** Fila de rpc('mis_pedidos') del pescador: los montos ya vienen calculados por la base. */
  pedido: MiPedido;
  /** Hora del servidor, compartida por toda la lista. */
  ahora: Date;
};

const MODALIDAD: Record<Modalidad, string> = { entrega: "Entrega", recoleccion: "Recojo en muelle" };

// La marisquería, o el nombre de quien pidió si no registró negocio.
const restauranteDe = (p: MiPedido) => p.contraparte_negocio ?? p.contraparte;

/** Un pedido por responder o en curso: qué, para quién, cuánto y la acción que toca. */
export function TarjetaVenta({ pedido, ahora }: Props) {
  const regla = reglaDe24h(pedido);

  return (
    <article className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/pedidos/${pedido.id}`}
          className="-my-2 inline-flex min-h-11 items-center gap-0.5 rounded-sm font-mono text-sm font-semibold text-ink underline underline-offset-4"
        >
          {pedido.folio}
          <span className="sr-only">: ver detalle</span>
          <ChevronRight aria-hidden className="size-4" />
        </Link>
        <EstadoPedido estado={pedido.estado} />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-bold text-ink">
            {pedido.especie} · {formatoKg(pedido.kg)}
          </h3>
          <p className="text-[13px] text-ink-muted">
            <span className="sr-only">Restaurante: </span>
            {restauranteDe(pedido)} · {MODALIDAD[pedido.modalidad]} · {horasDesde(pedido.creado_en, ahora)}
          </p>
          <p className="text-[13px] text-ink-muted">{textoPago(pedido)}</p>
        </div>
        <p className="shrink-0 text-right text-lg font-bold tabular-nums text-ink">{formatoDinero(pedido.total)}</p>
      </div>

      <TelefonoContraparte telefono={pedido.contraparte_telefono} />
      {regla && <p className="rounded-md bg-surface-sunken px-3 py-2 text-sm text-ink">{regla}</p>}

      <AccionesDe pedido={pedido} enLista />
      {pedido.estado === "solicitado" && (
        <p className="text-[13px] text-ink-muted">Si rechazas, los {formatoKg(pedido.kg)} vuelven a tu captura.</p>
      )}
    </article>
  );
}

/** Un pedido terminado: solo el resumen y el estado. Toda la tarjeta lleva al detalle. */
export function TarjetaVentaCompacta({ pedido, ahora }: Props) {
  return (
    <Link
      href={`/pedidos/${pedido.id}`}
      className="flex flex-col gap-2 rounded-lg bg-surface p-4 shadow-card transition-colors duration-150 hover:bg-surface-sunken"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold text-ink">{pedido.folio}</span>
        <EstadoPedido estado={pedido.estado} />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="font-bold text-ink">
            {pedido.especie} · {formatoKg(pedido.kg)}
          </p>
          <p className="truncate text-[13px] text-ink-muted">
            <span className="sr-only">Restaurante: </span>
            {restauranteDe(pedido)} · {horaSonora(pedido.creado_en, ahora)}
          </p>
        </div>
        <p className="shrink-0 text-right font-bold tabular-nums text-ink">{montoPescador(pedido)}</p>
      </div>
    </Link>
  );
}
