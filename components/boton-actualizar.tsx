"use client";

import { Boton } from "@/components/fd/boton";
import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Sin tiempo real: vuelve a pedir los datos al servidor. */
export function BotonActualizar() {
  const router = useRouter();
  const [actualizando, iniciar] = useTransition();

  return (
    <Boton
      variante="secundario"
      icono={RotateCw}
      ocupado={actualizando}
      textoOcupado="Actualizando…"
      onClick={() => iniciar(() => router.refresh())}
    >
      Actualizar
    </Boton>
  );
}
