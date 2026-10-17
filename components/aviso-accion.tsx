"use client";

import { createContext, useContext, useState } from "react";

// La confirmación vive fuera de las filas: tras router.refresh() el pedido puede
// pasar de Activos a Historial, su fila se vuelve a montar y perdería el aviso.
const ContextoAviso = createContext<(mensaje: string) => void>(() => {});

/** Envuelve una lista o un detalle y pinta arriba la última confirmación. */
export function AvisoAccionProvider({ children }: { children: React.ReactNode }) {
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <ContextoAviso.Provider value={setAviso}>
      <p role="status" className={aviso ? "rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900" : "sr-only"}>
        {aviso}
      </p>
      {children}
    </ContextoAviso.Provider>
  );
}

export function useAvisoAccion() {
  return useContext(ContextoAviso);
}
