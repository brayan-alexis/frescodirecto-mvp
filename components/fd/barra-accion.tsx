type Props = {
  /** Línea de resumen opcional: a la izquierda y a la derecha ("10 kg × $95.00" · "Total $950.00"). */
  resumen?: { izquierda: React.ReactNode; derecha: React.ReactNode };
  /** Uno o dos Boton bloque; dos van en columnas si los envuelves en un grid. */
  children: React.ReactNode;
};

/**
 * Barra fija inferior con la acción principal de la pantalla. Respeta el área segura del iPhone.
 * El -mx-4 compensa el px-4 de <main> en app/layout.tsx para llegar de orilla a orilla.
 */
export function BarraAccion({ resumen, children }: Props) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-col gap-2 bg-surface px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 shadow-bar">
      {resumen && (
        <div className="flex justify-between gap-2 text-sm text-ink-muted">
          <span className="tabular-nums">{resumen.izquierda}</span>
          <span className="tabular-nums">{resumen.derecha}</span>
        </div>
      )}
      {children}
    </div>
  );
}
