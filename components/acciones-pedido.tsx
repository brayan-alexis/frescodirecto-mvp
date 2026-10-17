"use client";

import { useAvisoAccion } from "@/components/aviso-accion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AccionPedido } from "@/lib/seguimiento";
import { createClient } from "@/lib/supabase/client";
import { leerErrorRpc } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

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

const ALERTA = "rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900";
const TEXTAREA =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
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

  const volver = (
    <Button type="button" variant="outline" className="h-11" disabled={enviando} onClick={() => abrir("inicio")}>
      Volver
    </Button>
  );

  const campoTexto = (etiqueta: string, ayuda: string) => {
    const idCampo = `${id}-texto`;
    const idError = `${id}-error`;
    return (
      <div className="grid gap-2">
        <Label htmlFor={idCampo}>{etiqueta}</Label>
        <textarea
          id={idCampo}
          rows={3}
          maxLength={500}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={enviando}
          placeholder={ayuda}
          aria-invalid={errores.nota ? true : undefined}
          aria-describedby={errores.nota ? idError : undefined}
          className={TEXTAREA}
        />
        {errores.nota && (
          <p id={idError} role="alert" className="text-sm font-medium text-destructive">
            {errores.nota}
          </p>
        )}
      </div>
    );
  };

  let contenido: React.ReactNode;
  switch (panel) {
    case "cancelar":
      contenido = (
        <>
          <p className="text-sm">Se cancelará el pedido y se te reembolsarán {montoPagado}.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              disabled={enviando}
              onClick={() =>
                ejecutar("cancelar_pedido", { p_pedido_id: pedidoId }, `Pedido cancelado. Reembolso de ${montoPagado}.`)
              }
            >
              {enviando ? "Cancelando…" : "Sí, cancelar y reembolsar"}
            </Button>
            {volver}
          </div>
        </>
      );
      break;
    case "confirmar":
      contenido = (
        <>
          <p className="text-sm font-medium">¿Cómo llegó el pedido?</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-11" onClick={() => abrir("conforme")}>
              Recibido conforme
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => abrir("incidencia")}>
              Con incidencia
            </Button>
            {volver}
          </div>
        </>
      );
      break;
    case "conforme":
      contenido = (
        <>
          <p className="text-sm">Se liberará el pago de {montoPescado} al pescador.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-11"
              disabled={enviando}
              onClick={() =>
                ejecutar(
                  "confirmar_recepcion",
                  { p_pedido_id: pedidoId, p_conforme: true },
                  `Pago liberado: ${montoPescado} para ${contraparte}.`,
                )
              }
            >
              {enviando ? "Liberando…" : "Sí, liberar pago"}
            </Button>
            {volver}
          </div>
        </>
      );
      break;
    case "incidencia":
      contenido = (
        <>
          {campoTexto("Describe la incidencia", "Ej.: llegó con hielo insuficiente")}
          <p className="text-sm text-muted-foreground">
            El pago queda retenido mientras FrescoDirecto revisa el caso.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-11"
              disabled={enviando}
              onClick={() =>
                ejecutar(
                  "confirmar_recepcion",
                  { p_pedido_id: pedidoId, p_conforme: false, p_nota: texto },
                  "Incidencia enviada: el pago queda en revisión por FrescoDirecto.",
                )
              }
            >
              {enviando ? "Enviando…" : "Enviar incidencia"}
            </Button>
            {volver}
          </div>
        </>
      );
      break;
    case "rechazar":
      contenido = (
        <>
          {campoTexto("Motivo (opcional)", "Ej.: no alcanza el producto")}
          <p className="text-sm text-muted-foreground">
            Los kg vuelven al catálogo y se reembolsan {montoPagado} al restaurante.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              disabled={enviando}
              onClick={() =>
                ejecutar(
                  "responder_pedido",
                  { p_pedido_id: pedidoId, p_aceptar: false, p_motivo: texto },
                  `Pedido rechazado. Reembolso de ${montoPagado} al restaurante.`,
                )
              }
            >
              {enviando ? "Rechazando…" : "Rechazar pedido"}
            </Button>
            {volver}
          </div>
        </>
      );
      break;
    default:
      contenido = (
        <div className="flex flex-wrap gap-2">
          {accion === "cancelar" && (
            <Button type="button" variant="outline" className="h-11" onClick={() => abrir("cancelar")}>
              Cancelar y reembolsar
            </Button>
          )}
          {accion === "confirmar" && (
            <Button type="button" className="h-11" onClick={() => abrir("confirmar")}>
              Confirmar recepción
            </Button>
          )}
          {accion === "responder" && (
            <>
              <Button
                type="button"
                className="h-11"
                disabled={enviando}
                onClick={() =>
                  ejecutar(
                    "responder_pedido",
                    { p_pedido_id: pedidoId, p_aceptar: true },
                    "Pedido aceptado: prepáralo para la entrega.",
                  )
                }
              >
                {enviando ? "Aceptando…" : "Aceptar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={enviando}
                onClick={() => abrir("rechazar")}
              >
                Rechazar
              </Button>
            </>
          )}
          {accion === "entregar" && (
            <Button
              type="button"
              className="h-11"
              disabled={enviando}
              onClick={() =>
                ejecutar(
                  "marcar_entregado",
                  { p_pedido_id: pedidoId },
                  "Pedido marcado como entregado. El restaurante confirmará la recepción.",
                )
              }
            >
              {enviando ? "Guardando…" : "Marcar entregado"}
            </Button>
          )}
        </div>
      );
  }

  return (
    <div className={cn("flex flex-col gap-3", panel !== "inicio" && "rounded-md border p-3")}>
      {errores.general && (
        <div role="alert" className={cn(ALERTA, "flex flex-col items-start gap-3")}>
          <p>{errores.general}</p>
          {errores.recargar && (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => {
                abrir("inicio");
                router.refresh();
              }}
            >
              Recargar
            </Button>
          )}
        </div>
      )}
      {contenido}
    </div>
  );
}
