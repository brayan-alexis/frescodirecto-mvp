import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export type VarianteBoton = "primario" | "secundario" | "peligro" | "fantasma";

const VARIANTES: Record<VarianteBoton, string> = {
  primario: "bg-boya text-on-boya hover:bg-boya-hover active:bg-boya-hover",
  secundario: "bg-surface text-ink border border-line-strong hover:bg-surface-sunken",
  peligro: "bg-surface text-error border border-error hover:bg-error-soft",
  fantasma: "bg-transparent px-3",
};

type Comunes = {
  variante?: VarianteBoton;
  /** Ancho completo (barra de acción fija). */
  bloque?: boolean;
  icono?: LucideIcon;
};

type PropsBoton = Comunes &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Mientras la RPC responde: deshabilitado, spinner y texto en gerundio. */
    ocupado?: boolean;
    textoOcupado?: string;
  };

type PropsEnlace = Comunes &
  Omit<React.ComponentProps<typeof Link>, "className"> & { className?: string };

function clases(variante: VarianteBoton, bloque: boolean | undefined, className?: string) {
  return cn(
    "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-md px-5 font-bold transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTES[variante],
    bloque && "w-full",
    className,
  );
}

/** Las clases de Boton, para un <a> que debe recargar la página completa ("Reintentar"). */
export const claseBoton = clases;

/** Botón del sistema. Etiqueta como verbo + objeto: "Pedir 10 kg · $950.00". */
export function Boton({
  variante = "primario",
  bloque,
  icono: Icono,
  ocupado,
  textoOcupado,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: PropsBoton) {
  return (
    <button
      type={type}
      disabled={disabled || ocupado}
      aria-busy={ocupado || undefined}
      className={clases(variante, bloque, className)}
      {...props}
    >
      {ocupado ? (
        <span
          aria-hidden
          className="size-5 shrink-0 motion-safe:animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        Icono && <Icono aria-hidden className="size-5 shrink-0" />
      )}
      {ocupado && textoOcupado ? textoOcupado : children}
    </button>
  );
}

/** El mismo aspecto que Boton, pero navega con next/link. */
export function BotonEnlace({
  variante = "primario",
  bloque,
  icono: Icono,
  className,
  children,
  ...props
}: PropsEnlace) {
  return (
    <Link className={clases(variante, bloque, className)} {...props}>
      {Icono && <Icono aria-hidden className="size-5 shrink-0" />}
      {children}
    </Link>
  );
}
