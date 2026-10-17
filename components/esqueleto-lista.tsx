type Props = {
  /** Lo que escucha el lector de pantalla mientras carga. */
  texto?: string;
  tarjetas?: number;
  /** Clases de la cuadrícula; el catálogo usa tres columnas en escritorio. */
  columnas?: string;
};

/** Tarjetas grises mientras llega la lista; el texto solo lo lee el lector de pantalla. */
export function EsqueletoLista({
  texto = "Cargando…",
  tarjetas = 3,
  columnas = "sm:grid-cols-2",
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="sr-only">
        {texto}
      </p>
      <div aria-hidden className={`grid grid-cols-1 gap-3 ${columnas}`}>
        {Array.from({ length: tarjetas }, (_, i) => (
          <div key={i} className="flex gap-3 rounded-xl border p-3">
            <div className="size-20 shrink-0 rounded-md bg-muted motion-safe:animate-pulse" />
            <div className="flex flex-1 flex-col justify-center gap-2">
              <div className="h-4 w-24 rounded bg-muted motion-safe:animate-pulse" />
              <div className="h-3 w-32 rounded bg-muted motion-safe:animate-pulse" />
              <div className="h-3 w-28 rounded bg-muted motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
