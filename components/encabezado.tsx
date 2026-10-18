import { BotonSalir } from "@/components/boton-salir";
import { Button } from "@/components/ui/button";
import { obtenerPerfil } from "@/lib/sesion";
import type { Rol } from "@/lib/tipos";
import Link from "next/link";
import { Suspense } from "react";

const ENLACES: Record<Rol | "visitante", { href: string; texto: string }[]> = {
  visitante: [
    { href: "/", texto: "Catálogo" },
    { href: "/login", texto: "Entrar" },
  ],
  restaurante: [
    { href: "/", texto: "Catálogo" },
    { href: "/pedidos", texto: "Mis pedidos" },
  ],
  pescador: [
    { href: "/pescador", texto: "Mis capturas" },
    { href: "/pescador/publicar", texto: "Publicar" },
    { href: "/pescador/ventas", texto: "Mis ventas" },
  ],
  admin: [
    { href: "/", texto: "Catálogo" },
    { href: "/admin", texto: "Administración" },
  ],
};

export function Encabezado() {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-[480px] flex-wrap items-center justify-between gap-x-4 px-4 py-1">
        <Link href="/" className="inline-flex min-h-11 items-center text-lg font-bold">
          FrescoDirecto
        </Link>
        <Suspense fallback={<div className="h-11" />}>
          <MenuPorRol />
        </Suspense>
      </div>
    </header>
  );
}

// Lee la sesión, por eso va dentro de <Suspense>.
async function MenuPorRol() {
  const perfil = await obtenerPerfil();
  const enlaces = ENLACES[perfil?.rol ?? "visitante"];

  return (
    <nav aria-label="Principal" className="flex flex-wrap items-center gap-1">
      {enlaces.map(({ href, texto }) => (
        <Link
          key={href}
          href={href}
          className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium hover:bg-accent"
        >
          {texto}
        </Link>
      ))}
      {perfil ? (
        <BotonSalir />
      ) : (
        <Button asChild className="h-11 px-3">
          <Link href="/registro">Crear cuenta</Link>
        </Button>
      )}
    </nav>
  );
}
