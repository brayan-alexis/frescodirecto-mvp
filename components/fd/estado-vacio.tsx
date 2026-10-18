import type { LucideIcon } from "lucide-react";

type Props = {
  icono: LucideIcon;
  titulo: string;
  ayuda?: string;
  /** Un Boton o BotonEnlace que resuelve el vacío ("Ver catálogo", "Quitar filtros"). */
  accion?: React.ReactNode;
};

/** Lista vacía: una frase en negritas, una de ayuda y, si existe, la acción. Nunca un error. */
export function EstadoVacio({ icono: Icono, titulo, ayuda, accion }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-ink-muted">
      <Icono aria-hidden className="size-10" />
      <p className="text-base font-bold text-ink">{titulo}</p>
      {ayuda && <p className="text-sm">{ayuda}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}
