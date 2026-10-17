"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatoDinero, formatoKg } from "@/lib/formato";
import {
  estimarPago,
  KG_INVALIDO,
  kgValido,
  MODALIDADES,
  TARJETAS_PRUEBA,
  ubicarErrorPedido,
  type TarjetaPrueba,
} from "@/lib/pedir";
import { DATO_INCOMPLETO, leerDecimal } from "@/lib/publicar";
import { createClient } from "@/lib/supabase/client";
import { leerErrorRpc, type FilaPedido, type Modalidad } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  capturaId: string;
  especie: string;
  precioKg: number;
};

type Errores = Partial<Record<"kg" | "pago" | "general", string>>;

const ALERTA = "rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900";

/** Pedido en dos pasos: kg y modalidad, luego pago con una tarjeta de prueba. */
export function FormularioPedido({ capturaId, especie, precioKg }: Props) {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [kg, setKg] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad>("entrega");
  const [tarjeta, setTarjeta] = useState<TarjetaPrueba>("4242");
  const [errores, setErrores] = useState<Errores>({});
  const [noDisponible, setNoDisponible] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // `disabled` llega hasta que React repinta; el ref frena un segundo clic inmediato.
  const enviandoRef = useRef(false);
  const tituloPaso = useRef<HTMLHeadingElement>(null);
  const campoKg = useRef<HTMLInputElement>(null);
  const primerPintado = useRef(true);

  // Al cambiar de paso, el foco va al encabezado (o a kg si volvió con un error).
  useEffect(() => {
    if (primerPintado.current) {
      primerPintado.current = false;
      return;
    }
    if (paso === 1 && errores.kg) campoKg.current?.focus();
    else tituloPaso.current?.focus();
    // Solo al cambiar de paso; el error de kg ya está puesto cuando ocurre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso]);

  const continuar = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!kg.trim()) {
      setErrores({ kg: DATO_INCOMPLETO });
      return;
    }
    if (!kgValido(leerDecimal(kg))) {
      setErrores({ kg: KG_INVALIDO });
      return;
    }
    setErrores({});
    setPaso(2);
  };

  const pagar = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setErrores({});

    const { data, error } = await createClient().rpc("solicitar_pedido", {
      p_captura_id: capturaId,
      p_kg: leerDecimal(kg),
      p_modalidad: modalidad,
      p_tarjeta_prueba: tarjeta,
    });

    if (error) {
      const { destino, mensaje } = ubicarErrorPedido(leerErrorRpc(error));
      if (destino === "no_disponible") setNoDisponible(mensaje);
      else setErrores({ [destino]: mensaje });
      if (destino === "kg") setPaso(1);
      enviandoRef.current = false;
      setEnviando(false);
      return;
    }
    // Sin reactivar el botón: evita un segundo pedido mientras navega.
    router.push(`/pedidos/${(data as FilaPedido).id}`);
  };

  if (noDisponible) {
    return (
      <div role="alert" className={cn(ALERTA, "flex flex-col items-start gap-3")}>
        <p>{noDisponible}</p>
        <Button asChild variant="outline" className="h-11">
          <Link href="/">Volver al catálogo</Link>
        </Button>
      </div>
    );
  }

  const estimado = paso === 2 ? estimarPago(leerDecimal(kg) ?? 0, precioKg) : null;

  return (
    <section aria-labelledby="titulo-pedido" className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex flex-col gap-0.5">
        <h2 id="titulo-pedido" className="text-lg font-semibold">
          Pedir esta captura
        </h2>
        <p ref={tituloPaso} tabIndex={-1} className="text-sm text-muted-foreground focus:outline-none">
          {paso === 1 ? "Paso 1 de 2 · Pedido" : "Paso 2 de 2 · Pago"}
        </p>
      </div>

      {errores.general && (
        <p role="alert" className={ALERTA}>
          {errores.general}
        </p>
      )}

      {paso === 1 ? (
        <form onSubmit={continuar} noValidate className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="kg-pedido">kg a pedir</Label>
            <Input
              ref={campoKg}
              id="kg-pedido"
              name="kg"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="10"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              aria-invalid={errores.kg ? true : undefined}
              aria-describedby={errores.kg ? "error-kg-pedido" : undefined}
              className="h-11"
            />
            {errores.kg && (
              <p id="error-kg-pedido" role="alert" className="text-sm font-medium text-destructive">
                {errores.kg}
              </p>
            )}
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium leading-none">Modalidad</legend>
            {MODALIDADES.map((m) => (
              <label
                key={m.valor}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-base has-[:checked]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  type="radio"
                  name="modalidad"
                  value={m.valor}
                  checked={modalidad === m.valor}
                  onChange={() => setModalidad(m.valor)}
                  className="size-4 accent-primary"
                />
                {m.texto}
              </label>
            ))}
          </fieldset>

          <Button type="submit" className="h-11 w-full text-base">
            Continuar al pago
          </Button>
        </form>
      ) : (
        estimado && (
          <form onSubmit={pagar} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-sm">
              <p className="text-base font-semibold">
                {especie} · {formatoKg(estimado.kg)}
              </p>
              <dl className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-3">
                  <dt>Pescado</dt>
                  <dd>{formatoDinero(estimado.pescado)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Comisión de servicio 5 %</dt>
                  <dd>{formatoDinero(estimado.comision)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t pt-2 text-base font-bold">
                  <dt>Total a pagar</dt>
                  <dd>{formatoDinero(estimado.total)}</dd>
                </div>
              </dl>
              <p className="text-muted-foreground">Estimado: el monto final lo calcula FrescoDirecto.</p>
            </div>

            <p className="rounded-md bg-muted px-3 py-2 text-sm">
              <strong>Pago protegido:</strong> FrescoDirecto guarda tu pago y se lo entrega al pescador
              cuando confirmes que recibiste el pedido. Si el pescador rechaza o no responde en 24 h,
              te devolvemos todo.
            </p>

            <div className="grid gap-2">
              <Label htmlFor="tarjeta">Tarjeta de prueba</Label>
              <select
                id="tarjeta"
                name="tarjeta"
                value={tarjeta}
                onChange={(e) => {
                  setTarjeta(e.target.value as TarjetaPrueba);
                  setErrores((previos) => ({ ...previos, pago: undefined }));
                }}
                disabled={enviando}
                aria-invalid={errores.pago ? true : undefined}
                aria-describedby={errores.pago ? "error-pago" : undefined}
                className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {TARJETAS_PRUEBA.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.texto}
                  </option>
                ))}
              </select>
              {errores.pago && (
                <p id="error-pago" role="alert" className="text-sm font-medium text-destructive">
                  {errores.pago}
                </p>
              )}
            </div>

            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-center text-sm font-medium text-amber-900">
              Modo de prueba: no se cobra dinero real
            </p>

            <div className="flex flex-col gap-2">
              <Button type="submit" className="h-11 w-full text-base" disabled={enviando}>
                {enviando ? "Procesando pago…" : `Pagar ${formatoDinero(estimado.total)}`}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                disabled={enviando}
                onClick={() => {
                  setErrores({});
                  setPaso(1);
                }}
              >
                ← Volver
              </Button>
            </div>
          </form>
        )
      )}
    </section>
  );
}
