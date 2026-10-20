// Piezas de un pedido que comparten el detalle (/pedidos/[id]) y la lista de Ventas.
import { AccionesPedido } from "@/components/acciones-pedido";
import { TarjetaCalificacion } from "@/components/tarjeta-calificacion";
import { formatoDinero, formatoEstrellas } from "@/lib/formato";
import { accionDe } from "@/lib/seguimiento";
import type { MiPedido } from "@/lib/tipos";

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

/** Acciones del pedido con los montos de mis_pedidos ya formateados. `enLista`: en la lista de Ventas. */
export function AccionesDe({ pedido, enLista }: { pedido: MiPedido; enLista?: boolean }) {
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
      enLista={enLista}
    />
  );
}

/**
 * Calificación del pedido para el restaurante: la tarjeta si la base dice `puede_calificar`,
 * o la que ya dejó, sin opción de cambiarla.
 */
export function CalificacionDe({ pedido }: { pedido: MiPedido }) {
  if (pedido.puede_calificar) {
    return <TarjetaCalificacion pedidoId={pedido.id} contraparte={pedido.contraparte} />;
  }
  if (pedido.mi_papel !== "restaurante" || pedido.calificacion == null) return null;
  return (
    <p className="font-bold text-ink">
      Calificaste con{" "}
      <span role="img" aria-label={`${pedido.calificacion} de 5 estrellas`} className="text-alerta">
        {formatoEstrellas(pedido.calificacion)}
      </span>
    </p>
  );
}

/** Lo que recibe el pescador; no paga comisión. Los montos vienen de mis_pedidos. */
export function montoPescador(pedido: Pick<MiPedido, "estado" | "pago_estado" | "monto_pescador" | "total">): string {
  if (pedido.estado === "rechazado" || pedido.estado === "cancelado") return "Sin cobro";
  if (pedido.pago_estado === "liberado") return `Recibiste ${formatoDinero(pedido.monto_pescador ?? 0)}`;
  return `Recibes ${formatoDinero(pedido.total)}`;
}
