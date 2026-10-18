"use client";

import { useAvisoAccion } from "@/components/aviso-accion";
import { Aviso } from "@/components/fd/aviso";
import { Boton } from "@/components/fd/boton";
import { MensajeCampo, idError } from "@/components/fd/campo";
import type { AccionPedido } from "@/lib/seguimiento";
import { createClient } from "@/lib/supabase/client";
import { leerErrorRpc } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, CircleCheck, TriangleAlert, Truck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  pedidoId: string;
  accion: AccionPedido;
  contraparte: string;
  // Montos de mis_pedidos ya formateados en el servidor: la pantalla no calcula dinero.
  montoPescado: string;
  montoPagado: string;
};

type Panel = "inicio" | "cancelar" | "confirmar" | "conforme" | "incidencia" | "rechazar";
type Errores = { general?: string; nota?: string; recargar?: boolean };

const ERROR_CONEXION = "No se pudo completar la acción. Revisa tu conexión e intenta de nuevo.";

/** Botones del pedido según el papel y el estado. Cada transición la valida y la hace la base. */
export function AccionesPedido({ pedidoId, accion, contraparte, montoPescado, montoPagado }: Props) {
  const router = useRouter();
  const avisar = useAvisoAccion();
  const id = useId();
  const [panel, setPanel] = useState<Panel>("inicio");
  const [texto, setTexto] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  // `disabled` llega hasta que React repinta; el ref frena un segundo clic inmediato.
  const enviandoRef = useRef(false);
  const campoTexto = useRef<HTMLTextAreaElement>(null);

  // Con el error de la nota, el foco vuelve al campo: el lector anuncia el mensaje.
  useEffect(() => {
    if (errores.nota) campoTexto.current?.focus();
  }, [errores.nota]);

  const abrir = (siguiente: Panel) => {
    setPanel(siguiente);
    setTexto("");
    setErrores({});
  };

  const ejecutar = async (funcion: string, args: Record<string, unknown>, aviso: string) => {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setErrores({});

    const { error } = await createClient().rpc(funcion, args);

    enviandoRef.current = false;
    setEnviando(false);
    if (error) {
      const e = leerErrorRpc(error);
      if (e.codigo === "TRANSICION_INVALIDA") setErrores({ general: e.mensaje, recargar: true });
      else if (e.campo === "nota") setErrores({ nota: e.mensaje });
      else setErrores({ general: e.codigo == null ? ERROR_CONEXION : e.mensaje });
      return;
    }
    abrir("inicio");
    avisar(aviso);
    router.refresh();
  };

  // Volver a la izquierda y la acción del panel ocupando el resto.
  const conVolver = (accionPanel: React.ReactNode) => (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
      <Boton variante="secundario" icono={ChevronLeft} disabled={enviando} onClick={() => abrir("inicio")}>
        Volver
      </Boton>
      {accionPanel}
    </div>
  );

  const campoNota = (etiqueta: string, ayuda: string) => {
    const idCampo = `${id}-texto`;
    return (
      <div className="flex flex-col gap-1.5" data-invalid={errores.nota ? "" : undefined}>
        <label htmlFor={idCampo} className="text-sm font-bold text-ink">
          {etiqueta}
        </label>
        <textarea
          ref={campoTexto}
          id={idCampo}
          rows={3}
          maxLength={500}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={enviando}
          placeholder={ayuda}
          aria-invalid={errores.nota ? true : undefined}
          aria-describedby={errores.nota ? idError(idCampo) : undefined}
          className={cn(
            "w-full rounded-md bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            errores.nota ? "border-2 border-error" : "border border-line-strong",
          )}
        />
        <MensajeCampo id={idCampo} error={errores.nota} />
      </div>
    );
  };

  let contenido: React.ReactNode;
  switch (panel) {
    case "cancelar":
      contenido = (
        <>
          <p className="text-sm text-ink">Se cancelará el pedido y se te reembolsarán {montoPagado}.</p>
          {conVolver(
            <Boton
              variante="peligro"
              bloque
              ocupado={enviando}
              textoOcupado="Cancelando…"
              onClick={() =>
                ejecutar("cancelar_pedido", { p_pedido_id: pedidoId }, `Pedido cancelado. Reembolso de ${montoPagado}.`)
              }
            >
              Sí, cancelar y reembolsar
            </Boton>,
          )}
        </>
      );
      break;
    case "confirmar":
      contenido = (
        <>
          <p className="text-sm font-bold text-ink">¿Cómo llegó el pedido?</p>
          <Boton bloque icono={CircleCheck} onClick={() => abrir("conforme")}>
            Recibido conforme
          </Boton>
          <Boton variante="peligro" bloque icono={TriangleAlert} onClick={() => abrir("incidencia")}>
            Con incidencia
          </Boton>
          <Boton variante="fantasma" bloque icono={ChevronLeft} onClick={() => abrir("inicio")}>
            Volver
          </Boton>
        </>
      );
      break;
    case "conforme":
      contenido = (
        <>
          <p className="text-sm text-ink">Se liberará el pago de {montoPescado} al pescador.</p>
          {conVolver(
            <Boton
              bloque
              ocupado={enviando}
              textoOcupado="Liberando…"
              onClick={() =>
                ejecutar(
                  "confirmar_recepcion",
                  { p_pedido_id: pedidoId, p_conforme: true },
                  `Pago liberado: ${montoPescado} para ${contraparte}.`,
                )
              }
            >
              Sí, liberar pago
            </Boton>,
          )}
        </>
      );
      break;
    case "incidencia":
      contenido = (
        <>
          {campoNota("Describe la incidencia", "Ej.: llegó con hielo insuficiente")}
          <p className="text-sm text-ink-muted">El pago queda retenido mientras FrescoDirecto revisa el caso.</p>
          {conVolver(
            <Boton
              bloque
              ocupado={enviando}
              textoOcupado="Enviando…"
              onClick={() =>
                ejecutar(
                  "confirmar_recepcion",
                  { p_pedido_id: pedidoId, p_conforme: false, p_nota: texto },
                  "Incidencia enviada: el pago queda en revisión por FrescoDirecto.",
                )
              }
            >
              Enviar incidencia
            </Boton>,
          )}
        </>
      );
      break;
    case "rechazar":
      contenido = (
        <>
          {campoNota("Motivo (opcional)", "Ej.: no alcanza el producto")}
          <p className="text-sm text-ink-muted">
            Los kg vuelven al catálogo y se reembolsan {montoPagado} al restaurante.
          </p>
          {conVolver(
            <Boton
              variante="peligro"
              bloque
              ocupado={enviando}
              textoOcupado="Rechazando…"
              onClick={() =>
                ejecutar(
                  "responder_pedido",
                  { p_pedido_id: pedidoId, p_aceptar: false, p_motivo: texto },
                  `Pedido rechazado. Reembolso de ${montoPagado} al restaurante.`,
                )
              }
            >
              Rechazar pedido
            </Boton>,
          )}
        </>
      );
      break;
    default:
      contenido = (
        <>
          {accion === "cancelar" && (
            <Boton variante="secundario" bloque onClick={() => abrir("cancelar")}>
              Cancelar y reembolsar
            </Boton>
          )}
          {accion === "confirmar" && (
            <Boton bloque onClick={() => abrir("confirmar")}>
              Confirmar recepción
            </Boton>
          )}
          {accion === "responder" && (
            <div className="grid grid-cols-2 gap-2">
              <Boton variante="secundario" icono={X} disabled={enviando} onClick={() => abrir("rechazar")}>
                Rechazar
              </Boton>
              <Boton
                icono={Check}
                ocupado={enviando}
                textoOcupado="Aceptando…"
                onClick={() =>
                  ejecutar(
                    "responder_pedido",
                    { p_pedido_id: pedidoId, p_aceptar: true },
                    "Pedido aceptado: prepáralo para la entrega.",
                  )
                }
              >
                Aceptar
              </Boton>
            </div>
          )}
          {accion === "entregar" && (
            <Boton
              bloque
              icono={Truck}
              ocupado={enviando}
              textoOcupado="Guardando…"
              onClick={() =>
                ejecutar(
                  "marcar_entregado",
                  { p_pedido_id: pedidoId },
                  "Pedido marcado como entregado. El restaurante confirmará la recepción.",
                )
              }
            >
              Marcar entregado
            </Boton>
          )}
        </>
      );
  }

  return (
    <div className="flex flex-col gap-2">
      {errores.general && (
        <Aviso tono="error" titulo={errores.general}>
          {errores.recargar && (
            <Boton
              variante="secundario"
              className="mt-3"
              onClick={() => {
                abrir("inicio");
                router.refresh();
              }}
            >
              Recargar
            </Boton>
          )}
        </Aviso>
      )}
      {contenido}
    </div>
  );
}
