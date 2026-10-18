"use client";

import { useAvisoAccion } from "@/components/aviso-accion";
import { BotonActualizar } from "@/components/boton-actualizar";
import { Aviso } from "@/components/fd/aviso";
import { Boton } from "@/components/fd/boton";
import { Campo, atributosControl, claseControl } from "@/components/fd/campo";
import { montoReembolso, OPCIONES_RESOLUCION, repartoDisputa, type OpcionResolucion } from "@/lib/disputas";
import { formatoDinero } from "@/lib/formato";
import { createClient } from "@/lib/supabase/client";
import { leerErrorRpc, type FilaPago } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

type Props = {
  pedidoId: string;
  folio: string;
  // Montos de disputas_abiertas: el valor del pescado y la comisión cobrada al pedir.
  subtotal: number;
  comision: number;
  pescador: string;
};

type Errores = { general?: string; reembolso?: string; nota?: string; recargar?: boolean };

const ERROR_CONEXION = "No se pudo resolver la disputa. Revisa tu conexión e intenta de nuevo.";

/**
 * Resolución de una disputa en dos pasos: elegir el reparto con su nota y confirmarlo.
 * La base valida la nota y el monto, mueve el dinero y deja la resolución en la bitácora.
 */
export function ResolverDisputa({ pedidoId, folio, subtotal, comision, pescador }: Props) {
  const router = useRouter();
  const avisar = useAvisoAccion();
  const id = useId();
  const [opcion, setOpcion] = useState<OpcionResolucion>("todo");
  const [parcial, setParcial] = useState("");
  const [nota, setNota] = useState("");
  // El reembolso ya revisado: con valor se muestra la confirmación.
  const [porConfirmar, setPorConfirmar] = useState<number | null>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  // `disabled` llega hasta que React repinta; el ref frena un segundo clic inmediato.
  const enviandoRef = useRef(false);

  const revisar = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const reembolso = montoReembolso(opcion, subtotal, parcial);
    if (reembolso == null) {
      setErrores({ reembolso: `Escribe un monto entre $0 y ${formatoDinero(subtotal)} (el valor del pescado).` });
      return;
    }
    setErrores({});
    setPorConfirmar(reembolso);
  };

  const resolver = async (reembolso: number) => {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setErrores({});

    const { data, error } = await createClient().rpc("resolver_disputa", {
      p_pedido_id: pedidoId,
      p_reembolso: reembolso,
      p_nota: nota,
    });

    enviandoRef.current = false;
    setEnviando(false);
    if (error) {
      const e = leerErrorRpc(error);
      setPorConfirmar(null);
      if (e.codigo === "TRANSICION_INVALIDA") setErrores({ general: e.mensaje, recargar: true });
      else if (e.campo === "nota") setErrores({ nota: e.mensaje });
      else if (e.campo === "reembolso") setErrores({ reembolso: e.mensaje });
      else setErrores({ general: e.codigo == null ? ERROR_CONEXION : e.mensaje });
      return;
    }
    // Los montos del aviso son los que guardó la base, no los de la confirmación.
    const pago = data as FilaPago;
    avisar(
      `Disputa ${folio} resuelta: ${formatoDinero(pago.monto_reembolsado)} devueltos al restaurante y ${formatoDinero(pago.monto_pescador)} pagados a ${pescador}.`,
    );
    router.refresh();
  };

  const idParcial = `${id}-parcial`;
  const idNota = `${id}-nota`;
  const reparto = porConfirmar != null ? repartoDisputa(subtotal, comision, porConfirmar) : null;
  const bloqueado = enviando || reparto != null;

  return (
    <div className="flex flex-col gap-3">
      {errores.general && (
        <Aviso tono="error" titulo={errores.general}>
          {errores.recargar && <BotonActualizar etiqueta="Recargar" className="mt-3" />}
        </Aviso>
      )}

      <form onSubmit={revisar} noValidate className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-1.5" disabled={bloqueado}>
          <legend className="mb-1.5 text-sm font-bold text-ink">Resolución</legend>
          <div className="flex flex-col gap-2">
            {OPCIONES_RESOLUCION.map((o) => {
              const elegida = opcion === o.valor;
              return (
                <label
                  key={o.valor}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-ink",
                    "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
                    "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
                    elegida ? "border-2 border-ink bg-marea-soft" : "border border-line-strong bg-surface",
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-opcion`}
                    value={o.valor}
                    checked={elegida}
                    onChange={() => {
                      setOpcion(o.valor);
                      setErrores((previos) => ({ ...previos, reembolso: undefined }));
                    }}
                    className="sr-only"
                  />
                  <span className="min-w-0 flex-1">{o.texto}</span>
                  {elegida && <Check aria-hidden className="size-4 shrink-0" strokeWidth={3} />}
                </label>
              );
            })}
          </div>
        </fieldset>

        {opcion === "parcial" ? (
          <Campo
            id={idParcial}
            etiqueta="Monto del pescado a reembolsar"
            ayuda={`De $0 a ${formatoDinero(subtotal)}.`}
            prefijo="$"
            error={errores.reembolso}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="85"
            value={parcial}
            onChange={(e) => setParcial(e.target.value)}
            disabled={bloqueado}
          />
        ) : (
          // Un error de la base sobre el monto con otra opción elegida va aquí, sin campo.
          errores.reembolso && <Aviso tono="error" titulo={errores.reembolso} />
        )}

        <Campo id={idNota} etiqueta="Nota de resolución" error={errores.nota}>
          <textarea
            {...atributosControl(idNota, errores.nota)}
            rows={3}
            maxLength={500}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            disabled={bloqueado}
            placeholder="Ej.: se comprobó con fotos que llegó sin hielo"
            className={cn(claseControl, "self-stretch py-2")}
          />
        </Campo>

        {reparto == null && (
          <Boton type="submit" variante="secundario" className="self-start">
            Revisar resolución
          </Boton>
        )}
      </form>

      {reparto != null && porConfirmar != null && (
        <div className="flex flex-col gap-3 rounded-md bg-surface-sunken p-3 text-sm text-ink">
          <p className="font-bold">
            Se devolverán <span className="tabular-nums">{formatoDinero(reparto.alRestaurante)}</span> al
            restaurante y se pagarán <span className="tabular-nums">{formatoDinero(reparto.alPescador)}</span> al
            pescador.
          </p>
          <p className="text-ink-muted">
            Incluye la comisión de {formatoDinero(comision)}: los pedidos con incidencia no la cobran.
          </p>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <Boton
              variante="secundario"
              icono={ChevronLeft}
              disabled={enviando}
              onClick={() => setPorConfirmar(null)}
            >
              Volver
            </Boton>
            <Boton bloque ocupado={enviando} textoOcupado="Resolviendo…" onClick={() => resolver(porConfirmar)}>
              Sí, resolver
            </Boton>
          </div>
        </div>
      )}
    </div>
  );
}
