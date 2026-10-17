"use client";

import { useAvisoAccion } from "@/components/aviso-accion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { leerErrorRpc } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

type Props = {
  pedidoId: string;
  contraparte: string;
  /** "P-0012 · Sierra": solo en la sección Por calificar, donde la tarjeta va sin su fila. */
  titulo?: string;
};

type Errores = { general?: string; estrellas?: string; comentario?: string; recargar?: boolean };

const MAX_COMENTARIO = 280;
const ALERTA = "rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900";
const TEXTAREA =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const ERROR_CONEXION = "No se pudo enviar la calificación. Revisa tu conexión e intenta de nuevo.";

/** Calificación opcional del pescador. La base valida quién, cuándo y que sea una sola vez. */
export function TarjetaCalificacion({ pedidoId, contraparte, titulo }: Props) {
  const router = useRouter();
  const avisar = useAvisoAccion();
  const id = useId();
  const [estrellas, setEstrellas] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  // "Ahora no" solo oculta la tarjeta en esta visita; al volver a entrar reaparece.
  const [oculta, setOculta] = useState(false);
  // `disabled` llega hasta que React repinta; el ref frena un segundo clic inmediato.
  const enviandoRef = useRef(false);

  if (oculta) return null;

  const idTitulo = `${id}-titulo`;
  const idErrorEstrellas = `${id}-error-estrellas`;
  const idComentario = `${id}-comentario`;
  const idContador = `${id}-contador`;
  const idErrorComentario = `${id}-error-comentario`;

  const enviar = async () => {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setErrores({});

    // Sin estrellas se envía igual: la base responde con el campo `estrellas`.
    const { error } = await createClient().rpc("calificar_pedido", {
      p_pedido_id: pedidoId,
      p_estrellas: estrellas,
      p_comentario: comentario,
    });

    enviandoRef.current = false;
    setEnviando(false);
    if (error) {
      const e = leerErrorRpc(error);
      if (e.campo === "estrellas") setErrores({ estrellas: e.mensaje });
      else if (e.campo === "comentario") setErrores({ comentario: e.mensaje });
      else if (e.codigo == null) setErrores({ general: ERROR_CONEXION });
      else setErrores({ general: e.mensaje, recargar: e.codigo !== "SIN_SESION" });
      return;
    }
    avisar(`Gracias. Calificaste a ${contraparte} con ${estrellas} de 5 estrellas.`);
    router.refresh();
  };

  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-3 rounded-xl border bg-card p-3 text-sm">
      <div className="flex flex-col gap-0.5">
        {titulo && (
          <Link
            href={`/pedidos/${pedidoId}`}
            className="inline-flex min-h-11 items-center self-start font-medium underline underline-offset-4"
          >
            {titulo}
          </Link>
        )}
        <h3 id={idTitulo} className="text-base font-semibold">
          ¿Cómo te fue con {contraparte}?
        </h3>
        <p className="text-muted-foreground">Es opcional y ayuda a otros restaurantes a elegir proveedor.</p>
      </div>

      {errores.general && (
        <div role="alert" className={cn(ALERTA, "flex flex-col items-start gap-3")}>
          <p>{errores.general}</p>
          {errores.recargar && (
            <Button type="button" variant="outline" className="h-11" onClick={() => router.refresh()}>
              Recargar
            </Button>
          )}
        </div>
      )}

      <fieldset
        className="flex flex-col gap-1"
        aria-describedby={errores.estrellas ? idErrorEstrellas : undefined}
      >
        <legend className="mb-1 font-medium">Satisfacción</legend>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="relative">
              <input
                type="radio"
                name={`${id}-estrellas`}
                value={n}
                checked={estrellas === n}
                onChange={() => setEstrellas(n)}
                disabled={enviando}
                aria-label={`${n} de 5 estrellas`}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "flex size-11 cursor-pointer items-center justify-center rounded-md text-3xl leading-none",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed",
                  estrellas != null && n <= estrellas ? "text-amber-500" : "text-muted-foreground",
                )}
              >
                {estrellas != null && n <= estrellas ? "★" : "☆"}
              </span>
            </label>
          ))}
        </div>
        <p className="text-muted-foreground">
          {estrellas != null ? `${estrellas} de 5 estrellas` : "Toca una estrella"}
        </p>
        {errores.estrellas && (
          <p id={idErrorEstrellas} role="alert" className="font-medium text-destructive">
            {errores.estrellas}
          </p>
        )}
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor={idComentario}>Comentario (opcional)</Label>
        <textarea
          id={idComentario}
          rows={3}
          maxLength={MAX_COMENTARIO}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          disabled={enviando}
          placeholder="Ej.: llegó fresco y a tiempo"
          aria-invalid={errores.comentario ? true : undefined}
          aria-describedby={errores.comentario ? `${idContador} ${idErrorComentario}` : idContador}
          className={TEXTAREA}
        />
        <p id={idContador} className="text-right text-xs text-muted-foreground">
          {comentario.length}/{MAX_COMENTARIO}
        </p>
        {errores.comentario && (
          <p id={idErrorComentario} role="alert" className="font-medium text-destructive">
            {errores.comentario}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" className="h-11" disabled={enviando} onClick={enviar}>
          {enviando ? "Enviando…" : "Enviar calificación"}
        </Button>
        <Button type="button" variant="outline" className="h-11" disabled={enviando} onClick={() => setOculta(true)}>
          Ahora no
        </Button>
      </div>
    </section>
  );
}
