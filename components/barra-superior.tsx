"use client";

import { BarraApp } from "@/components/fd/barra-app";
import { BotonSalir } from "@/components/boton-salir";
import type { Rol } from "@/lib/tipos";
import { usePathname } from "next/navigation";

// En los detalles y en Publicar, el botón Volver reemplaza a la marca.
function volverDe(pathname: string, rol: Rol | null) {
  if (/^\/captura\/[^/]+$/.test(pathname)) return { href: "/", texto: "Catálogo" };
  if (pathname === "/pescador/publicar") return { href: "/pescador", texto: "Mis capturas" };
  if (/^\/pedidos\/[^/]+$/.test(pathname)) {
    return rol === "pescador"
      ? { href: "/pescador/ventas", texto: "Ventas" }
      : { href: "/pedidos", texto: "Mis pedidos" };
  }
  return undefined;
}

/** BarraApp con el destino de Volver según la ruta, y Salir si hay sesión. */
export function BarraSuperior({ rol }: { rol: Rol | null }) {
  const pathname = usePathname();
  return (
    <BarraApp rol={rol} volver={volverDe(pathname, rol)}>
      {rol && <BotonSalir />}
    </BarraApp>
  );
}
