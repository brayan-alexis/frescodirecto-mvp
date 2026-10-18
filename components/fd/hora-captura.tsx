import { horasDesde, horasRestantes } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

type Props = {
  capturadaEn: string;
  compacta?: boolean;
  /** En el detalle: agrega "Hora declarada por el pescador." debajo de la barra. */
  conNota?: boolean;
  /**
   * Hora del servidor. Pásala desde un Server Component que ya leyó datos de la petición
   * (con cacheComponents, new Date() en el prerender falla) para que todas las tarjetas usen la misma.
   */
  ahora?: Date;
};

const HORAS_CATALOGO = 24;
const UMBRAL_BAJO = 6;

/** Cuánto hace que se capturó y cuánto le queda en el catálogo de 24 h. Trazabilidad declarada. */
export function HoraCaptura({ capturadaEn, compacta, conNota, ahora = new Date() }: Props) {
  const quedan = horasRestantes(capturadaEn, ahora);
  const bajo = quedan < UMBRAL_BAJO;
  const hace = horasDesde(capturadaEn, ahora);

  return (
    <div className="flex flex-col gap-1.5" data-nivel={bajo ? "bajo" : undefined}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="inline-flex min-w-0 items-center gap-1 text-ink">
          <Clock aria-hidden className="size-4 shrink-0" />
          <span className="truncate">{compacta ? hace.charAt(0).toUpperCase() + hace.slice(1) : `Capturado ${hace}`}</span>
        </span>
        <span className={cn("shrink-0", bajo ? "font-bold text-alerta" : "text-ink-muted")}>
          Quedan {quedan} h
        </span>
      </div>
      <div
        role="img"
        aria-label={`Quedan ${quedan} de ${HORAS_CATALOGO} horas en el catálogo`}
        className="h-1.5 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className={cn("h-full rounded-full", bajo ? "bg-alerta" : "bg-fresco")}
          style={{ width: `${(quedan / HORAS_CATALOGO) * 100}%` }}
        />
      </div>
      {conNota && <p className="text-[13px] text-ink-muted">Hora declarada por el pescador.</p>}
    </div>
  );
}
