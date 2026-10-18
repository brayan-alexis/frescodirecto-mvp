import { HoraCaptura } from "@/components/fd/hora-captura";
import { formatoDinero, formatoKg, formatoReputacion } from "@/lib/formato";
import type { CapturaCatalogo } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { Fish } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type Props = {
  /** Fila de rpc('catalogo_del_dia') (o detalle_captura): solo campos públicos. */
  captura: Pick<
    CapturaCatalogo,
    | "id"
    | "especie"
    | "pescador"
    | "cooperativa"
    | "kg_disponibles"
    | "kg_publicados"
    | "precio_kg"
    | "capturada_en"
    | "calificacion"
    | "num_calificaciones"
  >;
  /** URL pública de la foto (urlFoto de lib/fotos.ts), o null. */
  foto: string | null;
  /** Hora del servidor, compartida por todas las tarjetas de la lista. */
  ahora?: Date;
  /** "18 de 30 kg disponibles" (Mis capturas del pescador). */
  conPublicados?: boolean;
  /** null: tarjeta sin enlace. Por omisión, /captura/[id]. */
  href?: string | null;
};

/** Una captura del catálogo: especie y precio, luego kilos, luego quién y cuándo. */
export function TarjetaCaptura({ captura, foto, ahora, conPublicados, href }: Props) {
  const destino = href === undefined ? `/captura/${captura.id}` : href;
  const clase = "grid grid-cols-[112px_minmax(0,1fr)] gap-3 rounded-lg bg-surface p-3 shadow-card";

  const contenido = (
    <>
      {foto ? (
        <Image
          src={foto}
          alt={`Foto de ${captura.especie}`}
          width={112}
          height={112}
          sizes="112px"
          className="size-28 rounded-md bg-surface-sunken object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label="Sin foto"
          className="flex size-28 items-center justify-center rounded-md bg-marea-soft text-ink"
        >
          <Fish aria-hidden className="size-10" />
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-lg font-bold text-ink">{captura.especie}</h3>
          <p className="shrink-0 text-lg font-bold tabular-nums text-ink">
            {formatoDinero(captura.precio_kg)}
            <span className="text-[13px] font-normal text-ink-muted">/kg</span>
          </p>
        </div>
        <p className="truncate text-[13px] text-ink-muted">
          {captura.pescador}
          {captura.cooperativa ? ` · ${captura.cooperativa}` : ""} ·{" "}
          {formatoReputacion(captura.calificacion, captura.num_calificaciones, "corta")}
        </p>
        <p className="text-sm text-ink">
          {conPublicados ? (
            <>
              <strong className="tabular-nums">{formatoKg(captura.kg_disponibles).replace(" kg", "")}</strong> de{" "}
              {formatoKg(captura.kg_publicados)} disponibles
            </>
          ) : (
            <>
              <strong className="tabular-nums">{formatoKg(captura.kg_disponibles)}</strong> disponibles
            </>
          )}
        </p>
        <div className="mt-auto">
          <HoraCaptura capturadaEn={captura.capturada_en} compacta ahora={ahora} />
        </div>
      </div>
    </>
  );

  if (destino === null) return <article className={clase}>{contenido}</article>;

  return (
    <Link href={destino} className={cn(clase, "transition-colors duration-150 hover:bg-surface-sunken")}>
      {contenido}
    </Link>
  );
}
