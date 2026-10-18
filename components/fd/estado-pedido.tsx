import type { EstadoPedido as Estado } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { Ban, Check, CircleCheck, Clock, TriangleAlert, Truck, X, type LucideIcon } from "lucide-react";

// Los valores son los del enum public.estado_pedido; las palabras, las de la base.
export const ESTADOS: Record<Estado, { etiqueta: string; icono: LucideIcon; clase: string }> = {
  solicitado: { etiqueta: "Solicitado", icono: Clock, clase: "bg-solicitado-soft text-solicitado" },
  aceptado: { etiqueta: "Aceptado", icono: Check, clase: "bg-aceptado-soft text-aceptado" },
  entregado: { etiqueta: "Entregado", icono: Truck, clase: "bg-entregado-soft text-entregado" },
  recibido_conforme: {
    etiqueta: "Recibido conforme",
    icono: CircleCheck,
    clase: "bg-recibido-soft text-recibido",
  },
  con_incidencia: {
    etiqueta: "Con incidencia",
    icono: TriangleAlert,
    clase: "bg-incidencia-soft text-incidencia",
  },
  rechazado: { etiqueta: "Rechazado", icono: X, clase: "bg-rechazado-soft text-rechazado" },
  cancelado: { etiqueta: "Cancelado", icono: Ban, clase: "bg-cancelado-soft text-cancelado" },
};

/** Chip con ícono y palabra; el color solo refuerza. */
export function EstadoPedido({ estado, className }: { estado: Estado; className?: string }) {
  const { etiqueta, icono: Icono, clase } = ESTADOS[estado];
  return (
    <span
      data-estado={estado}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-sm px-2 text-sm font-bold",
        clase,
        className,
      )}
    >
      <Icono aria-hidden className="size-4" />
      {etiqueta}
    </span>
  );
}
