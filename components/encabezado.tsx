import { BarraSuperior } from "@/components/barra-superior";
import { NavInferior } from "@/components/fd/nav-inferior";
import { obtenerPerfil } from "@/lib/sesion";
import { Suspense } from "react";

/** Barra superior en color marea: marca y rol, o Volver en los detalles. */
export function Encabezado() {
  return (
    // Mientras se lee la sesión, la barra vacía ocupa su lugar y no salta el contenido.
    <Suspense fallback={<div aria-hidden className="h-14 border-b border-line bg-marea" />}>
      <BarraPorRol />
    </Suspense>
  );
}

// Lee la sesión, por eso va dentro de <Suspense>.
async function BarraPorRol() {
  const perfil = await obtenerPerfil();
  return <BarraSuperior rol={perfil?.rol ?? null} />;
}

/** Barra inferior con las secciones del rol; el visitante no tiene. */
export function NavegacionInferior() {
  return (
    <Suspense fallback={null}>
      <NavPorRol />
    </Suspense>
  );
}

async function NavPorRol() {
  const perfil = await obtenerPerfil();
  return <NavInferior rol={perfil?.rol ?? null} />;
}
