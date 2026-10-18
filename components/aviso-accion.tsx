"use client";

import { CircleCheck } from "lucide-react";
import { createContext, useContext, useState } from "react";

// La confirmación vive fuera de las filas: tras router.refresh() el pedido puede
// pasar de Activos a Historial, su fila se vuelve a montar y perdería el aviso.
const ContextoAviso = createContext<(mensaje: string) => void>(() => {});

/** Envuelve una lista o un detalle y pinta arriba la última confirmación. */
export function AvisoAccionProvider({ children }: { children: React.ReactNode }) {
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <ContextoAviso.Provider value={setAviso}>
      {/* Con el estilo de Aviso éxito (components/fd/aviso.tsx); el role="status" siempre está para que se anuncie. */}
      <p
        role="status"
        className={
          aviso
            ? "grid grid-cols-[20px_minmax(0,1fr)] gap-3 rounded-lg bg-fresco-soft px-4 py-3 text-base font-bold text-ink"
            : "sr-only"
        }
      >
        {aviso && <CircleCheck aria-hidden className="mt-0.5 size-5 text-fresco" />}
        {aviso && <span>{aviso}</span>}
      </p>
      {children}
    </ContextoAviso.Provider>
  );
}

export function useAvisoAccion() {
  return useContext(ContextoAviso);
}
