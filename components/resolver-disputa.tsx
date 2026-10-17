"use client";

import { useAvisoAccion } from "@/components/aviso-accion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { montoReembolso, OPCIONES_RESOLUCION, repartoDisputa, type OpcionResolucion } from "@/lib/disputas";
import { formatoDinero } from "@/lib/formato";
import { createClient } from "@/lib/supabase/client";
import { leerErrorRpc, type FilaPago } from "@/lib/tipos";
import { cn } from "@/lib/utils";
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

const ALERTA = "rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900";
const TEXTAREA =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
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
  const idErrorParcial = `${id}-error-parcial`;
  const idNota = `${id}-nota`;
  const idErrorNota = `${id}-error-nota`;
  const reparto = porConfirmar != null ? repartoDisputa(subtotal, comision, porConfirmar) : null;

  return (
    <div className="flex flex-col gap-3">
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

      <form onSubmit={revisar} noValidate className="flex flex-col gap-3">
        <fieldset className="grid gap-2" disabled={enviando || reparto != null}>
          <legend className="mb-2 text-sm font-medium leading-none">Resolución</legend>
          {OPCIONES_RESOLUCION.map((o) => (
            <label
              key={o.valor}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-base has-[:checked]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name={`${id}-opcion`}
                value={o.valor}
                checked={opcion === o.valor}
                onChange={() => {
                  setOpcion(o.valor);
                  setErrores((previos) => ({ ...previos, reembolso: undefined }));
                }}
                className="size-4 accent-primary"
              />
              {o.texto}
            </label>
          ))}
        </fieldset>

        {opcion === "parcial" && (
          <div className="grid gap-2">
            <Label htmlFor={idParcial}>Monto del pescado a reembolsar (de $0 a {formatoDinero(subtotal)})</Label>
            <Input
              id={idParcial}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="85"
              value={parcial}
              onChange={(e) => setParcial(e.target.value)}
              disabled={enviando || reparto != null}
              aria-invalid={errores.reembolso ? true : undefined}
              aria-describedby={errores.reembolso ? idErrorParcial : undefined}
              className="h-11"
            />
          </div>
        )}
        {errores.reembolso && (
          <p id={idErrorParcial} role="alert" className="text-sm font-medium text-destructive">
            {errores.reembolso}
          </p>
        )}

        <div className="grid gap-2">
          <Label htmlFor={idNota}>Nota de resolución</Label>
          <textarea
            id={idNota}
            rows={3}
            maxLength={500}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            disabled={enviando || reparto != null}
            placeholder="Ej.: se comprobó con fotos que llegó sin hielo"
            aria-invalid={errores.nota ? true : undefined}
            aria-describedby={errores.nota ? idErrorNota : undefined}
            className={TEXTAREA}
          />
          {errores.nota && (
            <p id={idErrorNota} role="alert" className="text-sm font-medium text-destructive">
              {errores.nota}
            </p>
          )}
        </div>

        {reparto == null && (
          <Button type="submit" className="h-11 self-start">
            Revisar resolución
          </Button>
        )}
      </form>

      {reparto != null && porConfirmar != null && (
        <div className="flex flex-col gap-3 rounded-md border p-3">
          <p className="text-sm font-medium">
            Se devolverán {formatoDinero(reparto.alRestaurante)} al restaurante y se pagarán{" "}
            {formatoDinero(reparto.alPescador)} al pescador.
          </p>
          <p className="text-sm text-muted-foreground">
            Incluye la comisión de {formatoDinero(comision)}: los pedidos con incidencia no la cobran.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-11" disabled={enviando} onClick={() => resolver(porConfirmar)}>
              {enviando ? "Resolviendo…" : "Sí, resolver"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={enviando}
              onClick={() => setPorConfirmar(null)}
            >
              Volver
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
