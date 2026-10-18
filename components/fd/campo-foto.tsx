/* eslint-disable @next/next/no-img-element -- la vista previa es un blob: local, no pasa por next/image */
import { MensajeCampo, atributosControl } from "@/components/fd/campo";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";

type Props = {
  id: string;
  etiqueta: string;
  /** URL de la foto ya comprimida (blob:), o null si aún no hay. */
  vistaPrevia: string | null;
  error?: string | null;
  /** Mientras se comprime la foto. */
  preparando?: boolean;
  disabled?: boolean;
  /** El manejador actual del formulario: comprime y guarda la foto. */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
};

const FOCO_PEER =
  "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus";

/**
 * Campo de foto. Solo presenta: el input de archivo es el de siempre y la compresión
 * la sigue haciendo el formulario en onChange. El input queda oculto a la vista pero
 * enfocable (peer); su etiqueta visible es el marco vacío o el botón "Cambiar foto".
 */
export function CampoFoto({ id, etiqueta, vistaPrevia, error, preparando, disabled, onChange, name }: Props) {
  const bloqueado = disabled || preparando;

  return (
    <div className="flex flex-col gap-1.5" data-invalid={error ? "" : undefined}>
      <span id={`${id}-etiqueta`} className="text-sm font-bold text-ink">
        {etiqueta}
      </span>
      {vistaPrevia && (
        <img
          src={vistaPrevia}
          alt="Vista previa de la foto"
          className={cn("mb-0.5 h-44 w-full rounded-lg object-cover", error && "border-2 border-error")}
        />
      )}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        name={name}
        disabled={bloqueado}
        onChange={onChange}
        aria-labelledby={`${id}-etiqueta ${id}-accion`}
        {...atributosControl(id, error)}
        className="peer sr-only"
      />
      {vistaPrevia ? (
        <label
          htmlFor={id}
          id={`${id}-accion`}
          className={cn(
            "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-line-strong bg-surface px-5 font-bold text-ink hover:bg-surface-sunken",
            FOCO_PEER,
            bloqueado && "cursor-wait opacity-50",
          )}
        >
          <Camera aria-hidden className="size-5" />
          {preparando ? "Preparando foto…" : "Cambiar foto"}
        </label>
      ) : (
        <label
          htmlFor={id}
          id={`${id}-accion`}
          className={cn(
            "flex h-[132px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed bg-surface-sunken text-center",
            FOCO_PEER,
            error ? "border-error" : "border-line-strong",
            bloqueado && "cursor-wait opacity-60",
          )}
        >
          <Camera aria-hidden className="size-7 text-ink-muted" />
          <span className="font-bold text-ink">{preparando ? "Preparando foto…" : "Tomar foto"}</span>
          <span className="text-sm text-ink-muted">o elegir de la galería</span>
        </label>
      )}
      <MensajeCampo id={id} error={error} />
    </div>
  );
}
