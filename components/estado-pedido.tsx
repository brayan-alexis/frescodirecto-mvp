import { formatoDinero } from "@/lib/formato";
import type { EstadoPedido, MiPedido } from "@/lib/tipos";
import { cn } from "@/lib/utils";

// Nombre corto para la pastilla y lo que significa para cada lado (docs/estados-pedido.md).
// Texto y color: el estado nunca depende solo del color.
export const ESTADOS_PEDIDO: Record<
  EstadoPedido,
  { nombre: string; restaurante: string; pescador: string; clase: string }
> = {
  solicitado: {
    nombre: "Solicitado",
    restaurante: "Esperando al pescador",
    pescador: "Nuevo pedido: aceptar o rechazar",
    clase: "border-slate-300 bg-slate-100 text-slate-800",
  },
  aceptado: {
    nombre: "Aceptado",
    restaurante: "En preparación",
    pescador: "Por entregar",
    clase: "border-sky-300 bg-sky-50 text-sky-900",
  },
  entregado: {
    nombre: "Entregado",
    restaurante: "Confirma si llegó bien",
    pescador: "Entregado, en espera de confirmación",
    clase: "border-amber-300 bg-amber-50 text-amber-900",
  },
  recibido_conforme: {
    nombre: "Recibido conforme",
    restaurante: "Recibido",
    pescador: "Venta cerrada: pago liberado",
    clase: "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
  con_incidencia: {
    nombre: "Con incidencia",
    restaurante: "Incidencia en revisión",
    pescador: "Incidencia: revisar nota",
    clase: "border-red-300 bg-red-50 text-red-900",
  },
  rechazado: {
    nombre: "Rechazado",
    restaurante: "Sin producto, reembolsado",
    pescador: "Rechazado",
    clase: "border-slate-300 bg-slate-100 text-slate-700",
  },
  cancelado: {
    nombre: "Cancelado",
    restaurante: "Cancelado, reembolsado",
    pescador: "Cancelado",
    clase: "border-slate-300 bg-slate-100 text-slate-700",
  },
};

/** Pastilla con el nombre del estado del pedido. */
export function EtiquetaEstado({ estado }: { estado: EstadoPedido }) {
  const { nombre, clase } = ESTADOS_PEDIDO[estado];
  return (
    <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-sm font-semibold", clase)}>
      {nombre}
    </span>
  );
}

/** Estado del pago en palabras: "Pago retenido por FrescoDirecto", "Reembolsado $997.50"… */
export function textoPago(p: Pick<MiPedido, "pago_estado" | "monto_reembolsado">): string {
  switch (p.pago_estado) {
    case "retenido":
      return "Pago retenido por FrescoDirecto";
    case "en_disputa":
      return "En revisión por FrescoDirecto";
    case "liberado":
      return "Pagado al pescador";
    case "reembolsado":
      return `Reembolsado ${formatoDinero(p.monto_reembolsado ?? 0)}`;
    default:
      return "Sin pago registrado";
  }
}
