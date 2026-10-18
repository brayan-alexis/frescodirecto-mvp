import { AvisoAccionProvider } from "@/components/aviso-accion";
import { AvisoModoPrueba } from "@/components/aviso-modo-prueba";
import { BotonActualizar } from "@/components/boton-actualizar";
import { ESTADOS_PEDIDO, textoPago } from "@/components/estado-pedido";
import { Aviso } from "@/components/fd/aviso";
import { BarraAccion } from "@/components/fd/barra-accion";
import { ErrorCarga } from "@/components/fd/error-carga";
import { EstadoPedido } from "@/components/fd/estado-pedido";
import { LineaTiempo, type EventoLinea } from "@/components/fd/linea-tiempo";
import { AccionesDe, CalificacionDe, TelefonoContraparte } from "@/components/fila-pedido";
import { FotoCaptura } from "@/components/foto-captura";
import { formatoDinero, formatoKg, horaSonora } from "@/lib/formato";
import { urlFoto } from "@/lib/fotos";
import { esUuid } from "@/lib/rutas";
import { accionDe, reglaDe24h } from "@/lib/seguimiento";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { FilaPedidoEvento, MiPedido, Modalidad } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type Props = {
  params: Promise<{ id: string }>;
};

type Evento = Pick<FilaPedidoEvento, "estado" | "nota" | "actor_id" | "creado_en">;

// Título fijo: con el folio habría que leer el pedido también para el <head>.
export const metadata: Metadata = { title: "Detalle del pedido" };

// Texto neutro: lo leen el restaurante y el pescador.
const MODALIDAD: Record<Modalidad, string> = {
  entrega: "Entrega en el negocio",
  recoleccion: "Recolección en el muelle",
};

const TARJETA = "rounded-lg bg-surface p-4 shadow-card";

export default function PaginaPedido({ params }: Props) {
  return (
    <Suspense fallback={<Esqueleto />}>
      <Contenido params={params} />
    </Suspense>
  );
}

// mis_pedidos solo devuelve los pedidos donde participa el usuario, con especie,
// contraparte, pago y calificación (el restaurante no puede leer la tabla capturas).
async function Contenido({ params }: Props) {
  const perfil = await exigirRol(["restaurante", "pescador"]);
  const { id } = await params;
  if (!esUuid(id)) notFound();

  const supabase = await createClient();
  const [{ data: pedido, error }, { data: eventos, error: errorEventos }] = await Promise.all([
    supabase.rpc("mis_pedidos").eq("id", id).maybeSingle<MiPedido>(),
    // La política "Eventos de mis pedidos o admin" solo deja leer los de pedidos propios.
    supabase
      .from("pedido_eventos")
      .select("estado, nota, actor_id, creado_en")
      .eq("pedido_id", id)
      .order("creado_en")
      .overrideTypes<Evento[], { merge: false }>(),
  ]);

  if (error || errorEventos) return <ErrorCarga titulo="No pudimos cargar el pedido" href={`/pedidos/${id}`} />;
  if (!pedido) notFound();

  const soyRestaurante = pedido.mi_papel === "restaurante";
  const estado = ESTADOS_PEDIDO[pedido.estado];
  const regla = reglaDe24h(pedido);
  const hayAccion = accionDe(pedido) != null;

  // Quién dio cada paso, sin otra consulta: yo, la contraparte o FrescoDirecto (resolución
  // de disputa). Sin actor, LineaTiempo pone "Automático".
  const pasos: EventoLinea[] = (eventos ?? []).map((e) => ({
    ...e,
    quien:
      e.actor_id == null
        ? null
        : e.actor_id === perfil.id
          ? "Tú"
          : e.estado === "con_incidencia" && e.nota?.startsWith("Resolución:")
            ? "FrescoDirecto"
            : pedido.contraparte,
  }));

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-sm font-semibold text-ink-muted">{pedido.folio}</p>
          <BotonActualizar />
        </div>
        <div className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-3">
          <FotoCaptura src={urlFoto(supabase, pedido.foto_path)} alt={`Foto de ${pedido.especie}`} variante="miniatura" />
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <h1 className="font-display text-[26px] font-bold leading-8 text-ink">
              {pedido.especie} · {formatoKg(pedido.kg)}
            </h1>
            <EstadoPedido estado={pedido.estado} />
          </div>
        </div>
        <p className="font-bold text-ink">{soyRestaurante ? estado.restaurante : estado.pescador}</p>
      </header>

      <Recibo pedido={pedido} />

      <section aria-label={soyRestaurante ? "Pescador" : "Restaurante"} className={cn(TARJETA, "flex gap-3")}>
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-marea-soft font-bold text-ink"
        >
          {iniciales(pedido.contraparte)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5 text-sm text-ink">
          <p className="text-base font-bold">{pedido.contraparte}</p>
          <p className="text-ink-muted">
            {soyRestaurante ? "Pescador" : "Restaurante"}
            {pedido.contraparte_negocio && ` · ${pedido.contraparte_negocio}`}
          </p>
          <TelefonoContraparte telefono={pedido.contraparte_telefono} />
          <p className="text-ink-muted">Pedido {horaSonora(pedido.creado_en)} (hora de Sonora)</p>
        </div>
      </section>

      {pedido.motivo_rechazo && (
        <Aviso tono="alerta" titulo="Motivo del rechazo">
          {pedido.motivo_rechazo}
        </Aviso>
      )}
      {pedido.nota_incidencia && (
        <Aviso tono="error" titulo="Incidencia">
          {pedido.nota_incidencia}
        </Aviso>
      )}
      {regla && <p className="rounded-md bg-surface-sunken px-3 py-2 text-sm text-ink">{regla}</p>}

      <section aria-labelledby="titulo-linea-tiempo" className={cn(TARJETA, "flex flex-col gap-4")}>
        <h2 id="titulo-linea-tiempo" className="text-lg font-bold text-ink">
          Línea de tiempo
        </h2>
        <LineaTiempo eventos={pasos} estado={pedido.estado} papel={pedido.mi_papel} modalidad={pedido.modalidad} />
      </section>

      <AvisoAccionProvider>
        {/* Tras "Recibido conforme", router.refresh() trae puede_calificar y aparece la tarjeta. */}
        <CalificacionDe pedido={pedido} />
        {hayAccion && (
          <BarraAccion>
            <AccionesDe pedido={pedido} />
          </BarraAccion>
        )}
      </AvisoAccionProvider>
    </article>
  );
}

/** "JV" de "Juan Valenzuela". */
function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

// Solo muestra montos de mis_pedidos: la base calcula el dinero.
function Recibo({ pedido }: { pedido: MiPedido }) {
  const fila = (etiqueta: React.ReactNode, monto: number | null) =>
    monto != null && (
      <div className="flex items-start justify-between gap-3">
        <dt>{etiqueta}</dt>
        <dd className="tabular-nums">{formatoDinero(monto)}</dd>
      </div>
    );

  const valorPescado = fila(
    <>
      Valor del pescado
      <span className="block text-[13px] text-ink-muted">
        {formatoKg(pedido.kg)} × {formatoDinero(pedido.precio_kg)} /kg
      </span>
    </>,
    pedido.total,
  );

  return (
    <section
      aria-labelledby={pedido.recibo ? "titulo-recibo" : undefined}
      aria-label={pedido.recibo ? undefined : "Pago"}
      className={cn(TARJETA, "flex flex-col gap-3 text-sm text-ink")}
    >
      <div className="flex justify-between gap-3">
        <span className="text-ink-muted">Modalidad</span>
        <span className="text-right font-bold">{MODALIDAD[pedido.modalidad]}</span>
      </div>
      <div aria-hidden className="h-px bg-line" />

      {pedido.recibo ? (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-recibo" className="text-base font-bold">
              Recibo de pago
            </h2>
            <span className="font-mono text-[13px] text-ink-muted">{pedido.recibo}</span>
          </div>
          <dl className="flex flex-col gap-2">
            {valorPescado}
            {fila("Comisión de servicio 5 %", pedido.comision)}
            {pedido.total_pagado != null && (
              <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
                <dt className="font-bold">Total pagado</dt>
                <dd className="text-2xl font-extrabold tabular-nums">{formatoDinero(pedido.total_pagado)}</dd>
              </div>
            )}
            {pedido.pago_estado === "liberado" && fila("Recibe el pescador", pedido.monto_pescador)}
            {(pedido.monto_reembolsado ?? 0) > 0 && fila("Reembolsado", pedido.monto_reembolsado)}
          </dl>
        </>
      ) : (
        <dl className="flex flex-col gap-2">{valorPescado}</dl>
      )}

      <p className="rounded-md bg-surface-sunken px-3 py-2 font-bold">{textoPago(pedido)}</p>
      <AvisoModoPrueba />
    </section>
  );
}

function Esqueleto() {
  const bloque = "rounded bg-surface-sunken motion-safe:animate-pulse";
  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="sr-only">
        Cargando pedido…
      </p>
      <div aria-hidden className={`h-4 w-24 ${bloque}`} />
      <div aria-hidden className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-3">
        <div className={`size-20 ${bloque}`} />
        <div className="flex flex-col gap-2">
          <div className={`h-7 w-40 ${bloque}`} />
          <div className={`h-6 w-24 ${bloque}`} />
        </div>
      </div>
      <div aria-hidden className={cn(TARJETA, "h-48")} />
      <div aria-hidden className={cn(TARJETA, "h-24")} />
    </div>
  );
}
