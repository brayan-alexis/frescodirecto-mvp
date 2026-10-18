import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";

type Props = {
  id: string;
  etiqueta: string;
  ayuda?: string;
  /** Mensaje ya traducido; con él el campo queda marcado como inválido. */
  error?: string | null;
  prefijo?: string;
  sufijo?: string;
  className?: string;
  /** Un control propio (por ejemplo un <select>) en lugar del input; recibe id y aria con `atributosControl`. */
  children?: React.ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "className" | "children">;

/** id del mensaje de ayuda o de error, para aria-describedby. */
export const idAyuda = (id: string) => `${id}-ayuda`;
export const idError = (id: string) => `${id}-error`;

/** aria-invalid y aria-describedby para un control propio dentro de Campo. */
export function atributosControl(id: string, error?: string | null, ayuda?: string) {
  return {
    id,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? idError(id) : ayuda ? idAyuda(id) : undefined,
  };
}

/** Clases del control interno, por si el consumidor pasa un <select> o <textarea>. */
export const claseControl =
  "min-h-12 min-w-0 flex-1 bg-transparent px-3 text-base tabular-nums text-ink outline-none";

/**
 * Etiqueta arriba, control de 48 px y debajo la ayuda o el error.
 * Para kilos y precio pasa inputMode="decimal".
 */
export function Campo({
  id,
  etiqueta,
  ayuda,
  error,
  prefijo,
  sufijo,
  className,
  children,
  ...input
}: Props) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)} data-invalid={error ? "" : undefined}>
      <label htmlFor={id} className="text-sm font-bold text-ink">
        {etiqueta}
      </label>
      <div
        className={cn(
          "flex min-h-12 items-center rounded-md bg-surface focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus",
          error ? "border-2 border-error" : "border border-line-strong",
        )}
      >
        {prefijo && (
          <span aria-hidden className="pl-3 font-bold text-ink-muted">
            {prefijo}
          </span>
        )}
        {children ?? <input {...input} {...atributosControl(id, error, ayuda)} className={claseControl} />}
        {sufijo && (
          <span aria-hidden className="pr-3 font-bold text-ink-muted">
            {sufijo}
          </span>
        )}
      </div>
      <MensajeCampo id={id} ayuda={ayuda} error={error} />
    </div>
  );
}

/** Ayuda en gris o error con ícono, debajo de un campo. */
export function MensajeCampo({ id, ayuda, error }: { id: string; ayuda?: string; error?: string | null }) {
  if (error) {
    return (
      <p id={idError(id)} className="flex gap-1 text-sm font-bold text-error">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>{error}</span>
      </p>
    );
  }
  if (ayuda) {
    return (
      <p id={idAyuda(id)} className="text-sm text-ink-muted">
        {ayuda}
      </p>
    );
  }
  return null;
}
