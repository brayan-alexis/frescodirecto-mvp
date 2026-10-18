"use client";

import { Aviso } from "@/components/fd/aviso";
import { useSearchParams } from "next/navigation";

const AVISOS = {
  acceso: "Inicia sesión con una cuenta autorizada para continuar.",
  rol: "Esa sección es para otro tipo de cuenta.",
} as const;

/** Aviso para ?aviso=acceso (sin sesión) y ?aviso=rol (cuenta de otro tipo). */
export function AvisoAcceso() {
  const aviso = useSearchParams().get("aviso");
  if (aviso !== "acceso" && aviso !== "rol") return null;

  return (
    <Aviso tono="error" titulo="Acceso denegado" className="mb-6">
      {AVISOS[aviso]}
    </Aviso>
  );
}
