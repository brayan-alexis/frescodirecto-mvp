"use client";

import { useAvisoAccion } from "@/components/aviso-accion";
import { Aviso } from "@/components/fd/aviso";
import { Boton } from "@/components/fd/boton";
import { MensajeCampo, idError } from "@/components/fd/campo";
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
  const idEstrellas = `${id}-estrellas`;
  const idComentario = `${id}-comentario`;
  const idContador = `${id}-contador`;

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
    <section
      aria-labelledby={idTitulo}
      className="flex flex-col gap-4 rounded-lg bg-surface p-4 text-sm text-ink shadow-card"
    >
      <div className="flex flex-col gap-0.5">
        {titulo && (
          <Link
            href={`/pedidos/${pedidoId}`}
            className="inline-flex min-h-11 items-center self-start font-mono font-semibold underline underline-offset-4"
          >
            {titulo}
          </Link>
        )}
        <h3 id={idTitulo} className="text-base font-bold">
          ¿Cómo te fue con {contraparte}?
        </h3>
        <p className="text-ink-muted">Es opcional y ayuda a otros restaurantes a elegir proveedor.</p>
      </div>

      {errores.general && (
        <Aviso tono="error" titulo={errores.general}>
          {errores.recargar && (
            <Boton variante="secundario" className="mt-3" onClick={() => router.refresh()}>
              Recargar
            </Boton>
          )}
        </Aviso>
      )}

      <fieldset
        className="flex flex-col gap-1"
        aria-describedby={errores.estrellas ? idError(idEstrellas) : undefined}
      >
        <legend className="mb-1 font-bold">Satisfacción</legend>
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
                  "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus peer-disabled:cursor-not-allowed",
                  estrellas != null && n <= estrellas ? "text-alerta" : "text-ink-muted",
                )}
              >
                {estrellas != null && n <= estrellas ? "★" : "☆"}
              </span>
            </label>
          ))}
        </div>
        <p className="text-ink-muted">{estrellas != null ? `${estrellas} de 5 estrellas` : "Toca una estrella"}</p>
        <MensajeCampo id={idEstrellas} error={errores.estrellas} />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={idComentario} className="font-bold">
          Comentario (opcional)
        </label>
        <textarea
          id={idComentario}
          rows={3}
          maxLength={MAX_COMENTARIO}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          disabled={enviando}
          placeholder="Ej.: llegó a tiempo y bien empacado"
          aria-invalid={errores.comentario ? true : undefined}
          aria-describedby={errores.comentario ? `${idContador} ${idError(idComentario)}` : idContador}
          className={cn(
            "w-full rounded-md bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            errores.comentario ? "border-2 border-error" : "border border-line-strong",
          )}
        />
        <p id={idContador} className="text-right text-[13px] text-ink-muted">
          {comentario.length}/{MAX_COMENTARIO}
        </p>
        <MensajeCampo id={idComentario} error={errores.comentario} />
      </div>

      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
        <Boton variante="secundario" disabled={enviando} onClick={() => setOculta(true)}>
          Ahora no
        </Boton>
        <Boton bloque ocupado={enviando} textoOcupado="Enviando…" onClick={enviar}>
          Enviar calificación
        </Boton>
      </div>
    </section>
  );
}
