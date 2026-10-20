import { EstadoPedido } from "@/components/fd/estado-pedido";
import { textoPago } from "@/components/estado-pedido";
import { formatoDinero, formatoKg, horaSonora } from "@/lib/formato";
import type { MiPedido } from "@/lib/tipos";
import Link from "next/link";

type Props = {
  /** Fila de rpc('mis_pedidos'): los montos ya vienen calculados por la base. */
  pedido: Pick<
    MiPedido,
    | "id"
    | "folio"
    | "estado"
    | "especie"
    | "kg"
    | "mi_papel"
    | "contraparte"
    | "creado_en"
    | "total"
    | "total_pagado"
    | "pago_estado"
    | "monto_reembolsado"
  >;
  ahora?: Date;
};

/** Un pedido en la lista: folio y estado, qué y de quién, y el total. Toda la tarjeta lleva al detalle. */
export function TarjetaPedido({ pedido, ahora }: Props) {
  const papelContraparte = pedido.mi_papel === "restaurante" ? "Pescador" : "Restaurante";
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
            <span className="sr-only">{papelContraparte}: </span>
            {pedido.contraparte} · {horaSonora(pedido.creado_en, ahora)}
          </p>
          <p className="text-[13px] text-ink-muted">{textoPago(pedido)}</p>
        </div>
        <p className="shrink-0 text-right font-bold tabular-nums text-ink">
          {formatoDinero(pedido.total_pagado ?? pedido.total)}
        </p>
      </div>
    </Link>
  );
}
