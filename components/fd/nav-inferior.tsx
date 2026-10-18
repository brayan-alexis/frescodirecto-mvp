"use client";

import type { Rol } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { Fish, List, Plus, Receipt, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Seccion = { href: string; texto: string; icono?: LucideIcon };

// Solo rutas que existen. "Cuenta" del restaurante queda fuera: no hay pantalla de cuenta.
const SECCIONES: Record<Rol, Seccion[]> = {
  restaurante: [
    { href: "/", texto: "Catálogo", icono: List },
    { href: "/pedidos", texto: "Mis pedidos", icono: Receipt },
  ],
  pescador: [
    { href: "/pescador", texto: "Mis capturas", icono: Fish },
    { href: "/pescador/publicar", texto: "Publicar", icono: Plus },
    { href: "/pescador/ventas", texto: "Ventas", icono: Receipt },
  ],
  admin: [
    { href: "/admin", texto: "Pescadores", icono: User },
    { href: "/admin#reiniciar-demo", texto: "Reiniciar demo" },
  ],
};

// Pantallas con barra de acción fija: ahí la acción ocupa el lugar de la navegación.
const CON_BARRA_ACCION = [/^\/captura\/[^/]+$/, /^\/pescador\/publicar$/, /^\/pedidos\/[^/]+$/];

/** La sección activa es la de ruta más larga que contiene a la actual ("/pescador" no gana a "/pescador/ventas"). */
function seccionActiva(secciones: Seccion[], pathname: string): string | null {
  const coinciden = secciones.filter(
    ({ href }) => !href.includes("#") && (pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))),
  );
  return coinciden.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

/** Barra inferior por rol (el visitante no tiene). Se oculta sola en pantallas con barra de acción. */
export function NavInferior({ rol }: { rol: Rol | null | undefined }) {
  const pathname = usePathname();
  if (!rol || CON_BARRA_ACCION.some((r) => r.test(pathname))) return null;

  const secciones = SECCIONES[rol];
  const activa = seccionActiva(secciones, pathname);

  return (
    <nav
      aria-label="Secciones"
      className="sticky bottom-0 z-10 bg-surface pb-[env(safe-area-inset-bottom)] shadow-bar"
    >
      <div className="mx-auto grid w-full max-w-[480px] auto-cols-fr grid-flow-col">
        {secciones.map(({ href, texto, icono: Icono }) => {
          const actual = href === activa;
          return (
            <Link
              key={href}
              href={href}
              aria-current={actual ? "page" : undefined}
              className={cn(
                "flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[13px] font-bold",
                actual ? "text-ink" : "text-ink-muted",
              )}
            >
              {Icono && <Icono aria-hidden className={cn("size-5", actual && "text-boya")} />}
              {texto}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
