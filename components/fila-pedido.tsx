import { AccionesPedido } from "@/components/acciones-pedido";
import { ESTADOS_PEDIDO, EtiquetaEstado, textoPago } from "@/components/estado-pedido";
import { formatoDinero, formatoKg } from "@/lib/formato";
import { accionDe, reglaDe24h } from "@/lib/seguimiento";
import type { MiPedido } from "@/lib/tipos";
import Link from "next/link";

/** Teléfono de la contraparte: mis_pedidos solo lo trae con el pedido aceptado o entregado. */
export function TelefonoContraparte({ telefono }: { telefono: string | null }) {
  if (!telefono) return null;
  return (
    <a
      href={`tel:${telefono}`}
      className="inline-flex min-h-11 items-center self-start font-medium underline underline-offset-4"
    >
      Tel. {telefono}
    </a>
  );
}

/** Acciones del pedido con los montos de mis_pedidos ya formateados. */
export function AccionesDe({ pedido }: { pedido: MiPedido }) {
  const accion = accionDe(pedido);
  if (!accion) return null;
  return (
    <AccionesPedido
      // Si el estado cambia, el panel abierto se reinicia.
      key={`${pedido.estado}-${accion}`}
      pedidoId={pedido.id}
      accion={accion}
      contraparte={pedido.contraparte}
      montoPescado={formatoDinero(pedido.total)}
      montoPagado={formatoDinero(pedido.total_pagado ?? pedido.total)}
    />
  );
}

/** Lo que recibe el pescador; no paga comisión. Los montos vienen de mis_pedidos. */
function montoPescador(pedido: MiPedido): string {
  if (pedido.estado === "rechazado" || pedido.estado === "cancelado") return "Sin cobro";
  if (pedido.pago_estado === "liberado") return `Recibiste ${formatoDinero(pedido.monto_pescador ?? 0)}`;
  return `Recibes ${formatoDinero(pedido.total)}`;
}

/** Fila de Mis pedidos (restaurante) o Mis ventas (pescador). */
export function FilaPedido({ pedido }: { pedido: MiPedido }) {
  const soyRestaurante = pedido.mi_papel === "restaurante";
  const estado = ESTADOS_PEDIDO[pedido.estado];
  const regla = reglaDe24h(pedido);

  return (
    <article className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold">
          <Link
            href={`/pedidos/${pedido.id}`}
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            {pedido.folio} · {pedido.especie}
          </Link>
        </h3>
        <EtiquetaEstado estado={pedido.estado} />
      </div>
      <p>
        {formatoKg(pedido.kg)} · {soyRestaurante ? `${formatoDinero(pedido.total_pagado ?? pedido.total)} pagados` : montoPescador(pedido)}
      </p>
      <p className="font-medium">{soyRestaurante ? estado.restaurante : estado.pescador}</p>
      <p className="text-muted-foreground">{textoPago(pedido)}</p>
      <div className="flex flex-col">
        <p>
          {soyRestaurante ? "Pescador" : "Restaurante"}: {pedido.contraparte}
          {pedido.contraparte_negocio && ` · ${pedido.contraparte_negocio}`}
        </p>
        <TelefonoContraparte telefono={pedido.contraparte_telefono} />
      </div>
      {regla && <p className="rounded-md bg-muted px-3 py-2">{regla}</p>}
      <AccionesDe pedido={pedido} />
    </article>
  );
}
