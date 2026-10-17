import { FotoCaptura } from "@/components/foto-captura";
import { estadoCaptura, horasDesde, type EstadoVista } from "@/lib/capturas";
import { formatoDinero, formatoKg, haceCuanto, horaSonora } from "@/lib/formato";
import type { MiCaptura } from "@/lib/tipos";
import { cn } from "@/lib/utils";

type Props = {
  captura: MiCaptura;
  foto: string | null;
  ahora: Date;
};

// Texto y color: el estado nunca depende solo del color.
const ESTADOS: Record<EstadoVista, { texto: string; clase: string }> = {
  activa: { texto: "Activa", clase: "border-emerald-300 bg-emerald-50 text-emerald-900" },
  agotada: { texto: "Agotada", clase: "border-amber-300 bg-amber-50 text-amber-900" },
  vencida: { texto: "Vencida", clase: "border-slate-300 bg-slate-100 text-slate-700" },
  retirada: { texto: "Retirada", clase: "border-red-300 bg-red-50 text-red-900" },
};

/** Fila de Mis capturas: especie, kg disponibles de publicados, precio, cuándo y estado. */
export function TarjetaMiCaptura({ captura, foto, ahora }: Props) {
  const especie = captura.especies?.nombre ?? "Especie";
  const estado = ESTADOS[estadoCaptura(captura, ahora)];
  const horas = horasDesde(captura.capturada_en, ahora);
  // Con más de 24 h, la fecha dice más que "hace 650 h".
  const cuando = horas < 24 ? haceCuanto(horas) : horaSonora(captura.capturada_en, ahora);

  return (
    <div className="flex h-full gap-3 rounded-xl border bg-card p-3">
      <FotoCaptura src={foto} alt={`Foto de ${especie}`} variante="miniatura" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 text-sm">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold">{especie}</h3>
          <span
            className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold", estado.clase)}
          >
            {estado.texto}
          </span>
        </div>
        <p>
          {formatoKg(captura.kg_disponibles)} de {formatoKg(captura.kg_publicados)} ·{" "}
          {formatoDinero(captura.precio_kg)}/kg
        </p>
        <p className="text-muted-foreground">{cuando}</p>
      </div>
    </div>
  );
}
