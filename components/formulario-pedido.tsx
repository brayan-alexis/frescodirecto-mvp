"use client";

import { AvisoModoPrueba } from "@/components/aviso-modo-prueba";
import { Aviso } from "@/components/fd/aviso";
import { BarraAccion } from "@/components/fd/barra-accion";
import { Boton, BotonEnlace } from "@/components/fd/boton";
import { Campo, MensajeCampo, atributosControl, claseControl } from "@/components/fd/campo";
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
import { Check, ChevronLeft, MapPin, Minus, Plus, Truck, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  capturaId: string;
  especie: string;
  precioKg: number;
  /** De detalle_captura: solo para la ayuda "Hasta 30 kg."; la base valida el inventario. */
  kgDisponibles: number;
};

type Errores = Partial<Record<"kg" | "pago" | "general", string>>;

const ICONO_MODALIDAD: Record<Modalidad, LucideIcon> = { entrega: Truck, recoleccion: MapPin };

/**
 * Pedido en dos pasos: kg y modalidad, luego pago con una tarjeta de prueba.
 * Devuelve el formulario y su barra de acción como hermanos: la barra queda fija
 * mientras se ve el detalle completo (su contenedor es el <article> de la página).
 */
export function FormularioPedido({ capturaId, especie, precioKg, kgDisponibles }: Props) {
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
  const tituloPaso = useRef<HTMLParagraphElement>(null);
  const campoKg = useRef<HTMLInputElement>(null);
  const campoTarjeta = useRef<HTMLSelectElement>(null);
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

  // Un pago rechazado deja el foco en la tarjeta: el lector anuncia el mensaje del campo.
  useEffect(() => {
    if (errores.pago) campoTarjeta.current?.focus();
  }, [errores.pago]);

  const continuar = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!kg.trim()) {
      setErrores({ kg: DATO_INCOMPLETO });
      campoKg.current?.focus();
      return;
    }
    if (!kgValido(leerDecimal(kg))) {
      setErrores({ kg: KG_INVALIDO });
      campoKg.current?.focus();
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

  // Los botones − y + solo ayudan a escribir; no limitan al disponible (eso lo valida la base).
  const ajustarKg = (delta: number) => {
    const nuevo = Math.max(0, Math.round(((leerDecimal(kg) ?? 0) + delta) * 100) / 100);
    setKg(nuevo === 0 ? "" : String(nuevo));
    setErrores((previos) => ({ ...previos, kg: undefined }));
  };

  if (noDisponible) {
    return (
      <Aviso tono="error" titulo="Esta captura ya no está disponible" className="mt-6">
        <p>{noDisponible}</p>
        <BotonEnlace variante="secundario" href="/" className="mt-3">
          Volver al catálogo
        </BotonEnlace>
      </Aviso>
    );
  }

  const kgNumero = leerDecimal(kg);
  const estimado = kgValido(kgNumero) ? estimarPago(kgNumero, precioKg) : null;
  const ayudaKg = `Hasta ${formatoKg(kgDisponibles)}.`;

  return (
    <>
      <section
        aria-labelledby="titulo-pedido"
        className="-mx-4 flex flex-col gap-4 border-t border-line bg-surface px-4 py-5"
      >
        <div className="flex flex-col gap-0.5">
          <h2 id="titulo-pedido" className="text-lg font-bold text-ink">
            Pedir esta captura
          </h2>
          <p ref={tituloPaso} tabIndex={-1} className="text-sm text-ink-muted focus:outline-none">
            {paso === 1 ? "Paso 1 de 2 · Pedido" : "Paso 2 de 2 · Pago"}
          </p>
        </div>

        {errores.general && <Aviso tono="error" titulo={errores.general} />}

        {paso === 1 ? (
          <form id="pedido-kg" onSubmit={continuar} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5" data-invalid={errores.kg ? "" : undefined}>
              <label htmlFor="kg-pedido" className="text-sm font-bold text-ink">
                kg a pedir
              </label>
              <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] gap-2">
                <Boton
                  variante="secundario"
                  aria-label="Quitar 1 kg"
                  icono={Minus}
                  className="px-0"
                  disabled={(kgNumero ?? 0) <= 0}
                  onClick={() => ajustarKg(-1)}
                />
                <div
                  className={cn(
                    "flex min-h-12 items-center rounded-md bg-surface focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus",
                    errores.kg ? "border-2 border-error" : "border border-line-strong",
                  )}
                >
                  <input
                    ref={campoKg}
                    name="kg"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="10"
                    value={kg}
                    onChange={(e) => setKg(e.target.value)}
                    {...atributosControl("kg-pedido", errores.kg, ayudaKg)}
                    className={cn(claseControl, "text-center text-lg font-bold")}
                  />
                  <span aria-hidden className="pr-3 font-bold text-ink-muted">
                    kg
                  </span>
                </div>
                <Boton
                  variante="secundario"
                  aria-label="Agregar 1 kg"
                  icono={Plus}
                  className="px-0"
                  onClick={() => ajustarKg(1)}
                />
              </div>
              <MensajeCampo id="kg-pedido" ayuda={ayudaKg} error={errores.kg} />
            </div>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-bold text-ink">Modalidad</legend>
              <div className="grid grid-cols-2 gap-2">
                {MODALIDADES.map((m) => {
                  const Icono = ICONO_MODALIDAD[m.valor];
                  const elegida = modalidad === m.valor;
                  return (
                    <label
                      key={m.valor}
                      className={cn(
                        "flex min-h-12 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-bold leading-tight text-ink",
                        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
                        elegida ? "border-2 border-ink bg-marea-soft" : "border border-line-strong bg-surface",
                      )}
                    >
                      <input
                        type="radio"
                        name="modalidad"
                        value={m.valor}
                        checked={elegida}
                        onChange={() => setModalidad(m.valor)}
                        className="sr-only"
                      />
                      <Icono aria-hidden className="size-5 shrink-0" />
                      <span className="min-w-0 flex-1">{m.texto}</span>
                      {elegida && <Check aria-hidden className="size-4 shrink-0" strokeWidth={3} />}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </form>
        ) : (
          estimado && (
            <form id="pedido-pago" onSubmit={pagar} noValidate className="flex flex-col gap-5">
              <div className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-4 text-sm text-ink">
                <p className="text-base font-bold">
                  {especie} · {formatoKg(estimado.kg)}
                </p>
                <dl className="flex flex-col gap-1.5 tabular-nums">
                  <div className="flex justify-between gap-3">
                    <dt>Pescado</dt>
                    <dd>{formatoDinero(estimado.pescado)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Comisión de servicio 5 %</dt>
                    <dd>{formatoDinero(estimado.comision)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-bold">
                    <dt>Total a pagar</dt>
                    <dd>{formatoDinero(estimado.total)}</dd>
                  </div>
                </dl>
                <p className="text-ink-muted">Estimado: el monto final lo calcula FrescoDirecto.</p>
                <p>
                  <strong>Pago protegido:</strong> FrescoDirecto guarda tu pago y se lo entrega al pescador
                  cuando confirmes que recibiste el pedido. Si el pescador rechaza o no responde en 24 h,
                  te devolvemos todo.
                </p>
              </div>

              <Campo id="tarjeta" etiqueta="Tarjeta de prueba" error={errores.pago}>
                <select
                  ref={campoTarjeta}
                  name="tarjeta"
                  value={tarjeta}
                  onChange={(e) => {
                    setTarjeta(e.target.value as TarjetaPrueba);
                    setErrores((previos) => ({ ...previos, pago: undefined }));
                  }}
                  disabled={enviando}
                  {...atributosControl("tarjeta", errores.pago)}
                  className={cn(claseControl, "w-full cursor-pointer")}
                >
                  {TARJETAS_PRUEBA.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.texto}
                    </option>
                  ))}
                </select>
              </Campo>

              <AvisoModoPrueba />
            </form>
          )
        )}
      </section>

      {paso === 1 ? (
        <BarraAccion
          resumen={
            estimado
              ? {
                  izquierda: `${formatoKg(estimado.kg)} × ${formatoDinero(precioKg)}`,
                  derecha: `Pescado ${formatoDinero(estimado.pescado)}`,
                }
              : undefined
          }
        >
          <Boton type="submit" form="pedido-kg" bloque>
            Continuar al pago
          </Boton>
        </BarraAccion>
      ) : (
        estimado && (
          <BarraAccion resumen={{ izquierda: "Total a pagar", derecha: formatoDinero(estimado.total) }}>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
              <Boton
                variante="secundario"
                icono={ChevronLeft}
                disabled={enviando}
                onClick={() => {
                  setErrores({});
                  setPaso(1);
                }}
              >
                Volver
              </Boton>
              <Boton type="submit" form="pedido-pago" bloque ocupado={enviando} textoOcupado="Procesando pago…">
                Pagar {formatoDinero(estimado.total)}
              </Boton>
            </div>
          </BarraAccion>
        )
      )}
    </>
  );
}
