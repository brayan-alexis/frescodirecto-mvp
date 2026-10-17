"use client";

import { useSearchParams } from "next/navigation";

const AVISOS = {
  acceso: "Acceso denegado: inicia sesión con una cuenta autorizada para continuar.",
  rol: "Acceso denegado: esa sección es para otro tipo de cuenta.",
} as const;

/** Franja para ?aviso=acceso (sin sesión) y ?aviso=rol (cuenta de otro tipo). */
export function AvisoAcceso() {
  const aviso = useSearchParams().get("aviso");
  if (aviso !== "acceso" && aviso !== "rol") return null;

  return (
    <p
      role="alert"
      className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
    >
      {AVISOS[aviso]}
    </p>
  );
}
