import type { Rol } from "@/lib/tipos";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export const NOMBRE_ROL: Record<Rol, string> = {
  restaurante: "Restaurante",
  pescador: "Pescador",
  admin: "Admin",
};

type Props = {
  /** null o sin valor: visitante (muestra "Entrar"). */
  rol?: Rol | null;
  /** En pantallas de detalle, el botón Volver reemplaza a la marca: { href: "/", texto: "Catálogo" }. */
  volver?: { href: string; texto: string };
  /** Acciones extra a la derecha (por ejemplo, Salir). */
  children?: React.ReactNode;
};

/** Barra superior de 56 px en color marea: marca y rol, o Volver en los detalles. */
export function BarraApp({ rol, volver, children }: Props) {
  return (
    <header className="border-b border-line bg-marea text-on-marea">
      <div className="mx-auto flex h-14 w-full max-w-[480px] items-center gap-2 px-4">
        {volver ? (
          <Link
            href={volver.href}
            className="-ml-3 inline-flex min-h-11 items-center gap-1 rounded-md px-3 font-bold"
          >
            <ChevronLeft aria-hidden className="size-5" />
            {volver.texto}
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-flex min-h-11 items-center font-display text-xl font-extrabold uppercase tracking-[0.06em]"
          >
            FrescoDirecto
          </Link>
        )}
        {rol && (
          <span className="rounded-sm border border-white/40 px-2 py-0.5 text-[13px]">{NOMBRE_ROL[rol]}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {children}
          {!rol && (
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-md px-3 font-bold">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
