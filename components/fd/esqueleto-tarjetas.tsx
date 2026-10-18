type Props = {
  /** Lo que escucha el lector de pantalla mientras carga. */
  texto: string;
  tarjetas?: number;
  /** Con el cuadro de foto de TarjetaCaptura (catálogo) o sin él (pedidos). */
  conFoto?: boolean;
};

const BLOQUE = "rounded bg-surface-sunken motion-safe:animate-pulse";

/** Tarjetas vacías del tamaño de las reales mientras llega la lista. */
export function EsqueletoTarjetas({ texto, tarjetas = 3, conFoto = true }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="sr-only">
        {texto}
      </p>
      {Array.from({ length: tarjetas }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className={
            conFoto
              ? "grid grid-cols-[112px_minmax(0,1fr)] gap-3 rounded-lg bg-surface p-3 shadow-card"
              : "flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card"
          }
        >
          {conFoto && <div className="size-28 rounded-md bg-surface-sunken motion-safe:animate-pulse" />}
          <div className="flex flex-col justify-center gap-2">
            <div className={`h-5 w-28 ${BLOQUE}`} />
            <div className={`h-3.5 w-40 ${BLOQUE}`} />
            <div className={`h-3.5 w-24 ${BLOQUE}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
