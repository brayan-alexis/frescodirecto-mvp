import { FotoCaptura } from "@/components/foto-captura";
import { estadoCaptura, horasDesde, type EstadoVista } from "@/lib/capturas";
import { formatoDinero, formatoKg, haceCuanto, horaSonora } from "@/lib/formato";
import type { MiCaptura } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { Ban, CircleCheck, Clock, X, type LucideIcon } from "lucide-react";

type Props = {
  captura: MiCaptura;
  foto: string | null;
  ahora: Date;
};

// Texto e ícono: el estado nunca depende solo del color. Pares de color del sistema de diseño.
const ESTADOS: Record<EstadoVista, { texto: string; icono: LucideIcon; clase: string }> = {
  activa: { texto: "Activa", icono: CircleCheck, clase: "bg-fresco-soft text-fresco" },
  agotada: { texto: "Agotada", icono: Ban, clase: "bg-alerta-soft text-alerta" },
  vencida: { texto: "Vencida", icono: Clock, clase: "bg-cancelado-soft text-cancelado" },
  retirada: { texto: "Retirada", icono: X, clase: "bg-rechazado-soft text-rechazado" },
};

/** Fila compacta del historial de Mis capturas: especie, kg de publicados, precio, cuándo y estado. */
export function TarjetaMiCaptura({ captura, foto, ahora }: Props) {
  const especie = captura.especies?.nombre ?? "Especie";
  const { texto, icono: Icono, clase } = ESTADOS[estadoCaptura(captura, ahora)];
  const horas = horasDesde(captura.capturada_en, ahora);
  // Con más de 24 h, la fecha dice más que "hace 650 h".
  const cuando = horas < 24 ? haceCuanto(horas) : horaSonora(captura.capturada_en, ahora);

  return (
    <article className="flex gap-3 rounded-lg bg-surface p-3 shadow-card">
      <FotoCaptura src={foto} alt={`Foto de ${especie}`} variante="miniatura" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 text-sm text-ink">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 break-words text-base font-bold">{especie}</h3>
          <span
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-sm px-2 text-sm font-bold",
              clase,
            )}
          >
            <Icono aria-hidden className="size-4" />
            {texto}
          </span>
        </div>
        <p className="tabular-nums">
          {formatoKg(captura.kg_disponibles)} de {formatoKg(captura.kg_publicados)} ·{" "}
          {formatoDinero(captura.precio_kg)}
          <span className="text-[13px] text-ink-muted">/kg</span>
        </p>
        <p className="text-[13px] text-ink-muted">Capturada {cuando}</p>
      </div>
    </article>
  );
}
