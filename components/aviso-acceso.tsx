"use client";

import { Aviso } from "@/components/fd/aviso";
import { usePathname, useSearchParams } from "next/navigation";

const AVISOS = {
  acceso: "Inicia sesión con una cuenta autorizada para continuar.",
  rol: "Esa sección es para otro tipo de cuenta.",
} as const;

// En /login el aviso va dentro de la tarjeta del formulario, no arriba del bloque de marca.
const CON_AVISO_PROPIO = ["/login"];

/**
 * Aviso para ?aviso=acceso (sin sesión) y ?aviso=rol (cuenta de otro tipo).
 * El layout raíz lo pinta en todas las páginas; `enFormulario` es el de /login.
 */
export function AvisoAcceso({ enFormulario = false }: { enFormulario?: boolean }) {
  const aviso = useSearchParams().get("aviso");
  const propio = CON_AVISO_PROPIO.includes(usePathname());
  if (propio !== enFormulario) return null;
  if (aviso !== "acceso" && aviso !== "rol") return null;

  return (
    <Aviso tono="error" titulo="Acceso denegado" className={enFormulario ? undefined : "mb-6"}>
      {AVISOS[aviso]}
    </Aviso>
  );
}
