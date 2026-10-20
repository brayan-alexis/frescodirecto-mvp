"use client"; // Los límites de error deben ser Client Components.

import { Aviso } from "@/components/fd/aviso";
import { Boton } from "@/components/fd/boton";
import { RotateCw } from "lucide-react";
import { useEffect, useTransition } from "react";

// En Next 16 la prop para volver a intentar se llama `retry` (antes `reset`).
export default function PaginaError({ error, retry }: { error: unknown; retry: () => void }) {
  // retry() vuelve a pedir el segmento al servidor: mientras, el botón queda ocupado.
  const [reintentando, iniciar] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Aviso tono="error" titulo="No pudimos cargar esta pantalla">
      <p>Revisa tu conexión y vuelve a intentar.</p>
      <Boton
        variante="secundario"
        icono={RotateCw}
        className="mt-3"
        ocupado={reintentando}
        textoOcupado="Reintentando…"
        onClick={() => iniciar(() => retry())}
      >
        Reintentar
      </Boton>
    </Aviso>
  );
}
