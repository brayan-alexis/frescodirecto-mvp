import { cn } from "@/lib/utils";
import { CircleCheck, Info, TriangleAlert } from "lucide-react";

export type TonoAviso = "exito" | "error" | "alerta";

const TONOS = {
  exito: { fondo: "bg-fresco-soft", icono: CircleCheck, color: "text-fresco", rol: "status" },
  error: { fondo: "bg-error-soft", icono: TriangleAlert, color: "text-error", rol: "alert" },
  alerta: { fondo: "bg-alerta-soft", icono: Info, color: "text-alerta", rol: undefined },
} as const;

type Props = {
  tono: TonoAviso;
  titulo: string;
  children?: React.ReactNode;
  className?: string;
};

/** Mensaje del sistema: qué pasó y qué hacer. Error con role="alert"; éxito con role="status". */
export function Aviso({ tono, titulo, children, className }: Props) {
  const { fondo, icono: Icono, color, rol } = TONOS[tono];
  return (
    <div
      role={rol}
      className={cn("grid grid-cols-[20px_minmax(0,1fr)] gap-3 rounded-lg px-4 py-3 text-sm text-ink", fondo, className)}
    >
      <Icono aria-hidden className={cn("mt-0.5 size-5", color)} />
      <div>
        <strong className="block text-base font-bold">{titulo}</strong>
        {children}
      </div>
    </div>
  );
}
