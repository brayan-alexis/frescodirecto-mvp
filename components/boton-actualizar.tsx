"use client";

import { Boton } from "@/components/fd/boton";
import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Props = {
  /** "Recargar" dentro de un aviso de error; "Actualizar" en el título de la lista. */
  etiqueta?: "Actualizar" | "Recargar";
  className?: string;
  /** Cambios de estado que se pintan junto con los datos nuevos (cerrar el aviso). */
  alActualizar?: () => void;
};

const OCUPADO = { Actualizar: "Actualizando…", Recargar: "Recargando…" } as const;

/** Sin tiempo real: vuelve a pedir los datos al servidor. */
export function BotonActualizar({ etiqueta = "Actualizar", className, alActualizar }: Props) {
  const router = useRouter();
  const [actualizando, iniciar] = useTransition();

  return (
    <Boton
      variante="secundario"
      icono={RotateCw}
      className={className}
      ocupado={actualizando}
      textoOcupado={OCUPADO[etiqueta]}
      onClick={() =>
        iniciar(() => {
          alActualizar?.();
          router.refresh();
        })
      }
    >
      {etiqueta}
    </Boton>
  );
}
