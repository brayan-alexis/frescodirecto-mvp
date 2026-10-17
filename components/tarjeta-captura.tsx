import { FotoCaptura } from "@/components/foto-captura";
import { formatoDinero, formatoKg, formatoReputacion, haceCuanto } from "@/lib/formato";
import type { CapturaCatalogo } from "@/lib/tipos";
import Link from "next/link";

type Props = {
  captura: CapturaCatalogo;
  foto: string | null;
};

/** Tarjeta del catálogo: toda la tarjeta lleva al detalle de la captura. */
export function TarjetaCaptura({ captura, foto }: Props) {
  return (
    <Link
      href={`/captura/${captura.id}`}
      className="flex h-full gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <FotoCaptura src={foto} alt={`Foto de ${captura.especie}`} variante="miniatura" />
      <div className="flex min-w-0 flex-col justify-center text-sm">
        <h2 className="text-base font-semibold">{captura.especie}</h2>
        <p>
          {formatoKg(captura.kg_disponibles)} · {formatoDinero(captura.precio_kg)}/kg
        </p>
        <p className="text-muted-foreground">
          {haceCuanto(captura.horas_desde_captura)} ·{" "}
          {formatoReputacion(captura.calificacion, captura.num_calificaciones, "corta")}
        </p>
        <p className="truncate text-muted-foreground">
          {captura.pescador}
          {captura.cooperativa ? ` · ${captura.cooperativa}` : ""}
        </p>
      </div>
    </Link>
  );
}
