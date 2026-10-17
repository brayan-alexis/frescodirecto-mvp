import { AvisoAccionProvider } from "@/components/aviso-accion";
import { BotonActualizar } from "@/components/boton-actualizar";
import { Cargando } from "@/components/cargando";
import { ESTADOS_PEDIDO, EtiquetaEstado, textoPago } from "@/components/estado-pedido";
import { AccionesDe, TelefonoContraparte } from "@/components/fila-pedido";
import { FotoCaptura } from "@/components/foto-captura";
import { LineaTiempo, type EventoPedido } from "@/components/linea-tiempo";
import { Button } from "@/components/ui/button";
import { formatoDinero, formatoKg, horaSonora } from "@/lib/formato";
import { urlFoto } from "@/lib/fotos";
import { esUuid } from "@/lib/rutas";
import { reglaDe24h } from "@/lib/seguimiento";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { MiPedido, Modalidad } from "@/lib/tipos";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type Props = {
  params: Promise<{ id: string }>;
};

// Texto neutro: lo leen el restaurante y el pescador.
const MODALIDAD: Record<Modalidad, string> = {
  entrega: "Entrega en el negocio",
  recoleccion: "Recolección en el muelle",
};

export default function PaginaPedido({ params }: Props) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido params={params} />
    </Suspense>
  );
}

// mis_pedidos solo devuelve los pedidos donde participa el usuario, con especie,
// contraparte, pago y calificación (el restaurante no puede leer la tabla capturas).
async function Contenido({ params }: Props) {
  await exigirRol(["restaurante", "pescador"]);
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
      .overrideTypes<EventoPedido[], { merge: false }>(),
  ]);

  if (error || errorEventos) {
    return (
      <div
        role="alert"
        className="mx-auto flex max-w-xl flex-col items-start gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
      >
        <p>No pudimos cargar el pedido. Revisa tu conexión e inténtalo de nuevo.</p>
        <Button asChild variant="outline" className="h-11">
          <a href={`/pedidos/${id}`}>Reintentar</a>
        </Button>
      </div>
    );
  }
  if (!pedido) notFound();

  const soyRestaurante = pedido.mi_papel === "restaurante";
  const estado = ESTADOS_PEDIDO[pedido.estado];
  const regla = reglaDe24h(pedido);

  return (
    <article className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={soyRestaurante ? "/pedidos" : "/pescador/ventas"}
          className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline"
        >
          ← {soyRestaurante ? "Mis pedidos" : "Mis ventas"}
        </Link>
        <BotonActualizar />
      </div>

      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{pedido.folio}</h1>
          <EtiquetaEstado estado={pedido.estado} />
        </div>
        <p className="font-medium">{soyRestaurante ? estado.restaurante : estado.pescador}</p>
      </header>

      <section aria-label="Producto" className="flex gap-3 rounded-xl border p-3">
        <FotoCaptura
          src={urlFoto(supabase, pedido.foto_path)}
          alt={`Foto de ${pedido.especie}`}
          variante="miniatura"
        />
        <div className="flex min-w-0 flex-col justify-center gap-0.5 text-sm">
          <p className="text-base font-semibold">{pedido.especie}</p>
          <p>
            {formatoKg(pedido.kg)} · {formatoDinero(pedido.precio_kg)}/kg
          </p>
          <p>{MODALIDAD[pedido.modalidad]}</p>
        </div>
      </section>

      <div className="flex flex-col gap-0.5 text-sm">
        <p>
          {soyRestaurante ? "Pescador" : "Restaurante"}: {pedido.contraparte}
          {pedido.contraparte_negocio && ` · ${pedido.contraparte_negocio}`}
        </p>
        <TelefonoContraparte telefono={pedido.contraparte_telefono} />
        <p className="text-muted-foreground">
          Pedido {horaSonora(pedido.creado_en)} (hora de Sonora)
        </p>
      </div>

      {pedido.motivo_rechazo && (
        <p className="rounded-xl border p-3 text-sm">
          <strong>Motivo del rechazo:</strong> {pedido.motivo_rechazo}
        </p>
      )}
      {pedido.nota_incidencia && (
        <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <strong>Incidencia:</strong> {pedido.nota_incidencia}
        </p>
      )}

      <AvisoAccionProvider>
        {regla && <p className="rounded-md bg-muted px-3 py-2 text-sm">{regla}</p>}
        <AccionesDe pedido={pedido} />
      </AvisoAccionProvider>

      <Recibo pedido={pedido} />
      <LineaTiempo eventos={eventos ?? []} />
    </article>
  );
}

// Solo muestra montos de mis_pedidos: la base calcula el dinero.
function Recibo({ pedido }: { pedido: MiPedido }) {
  if (!pedido.recibo) {
    return <p className="rounded-xl border p-3 text-sm">{textoPago(pedido)}</p>;
  }

  const fila = (etiqueta: string, monto: number | null, fuerte = false) =>
    monto != null && (
      <div className={fuerte ? "flex justify-between gap-3 border-t pt-2 text-base font-bold" : "flex justify-between gap-3"}>
        <dt>{etiqueta}</dt>
        <dd>{formatoDinero(monto)}</dd>
      </div>
    );

  return (
    <section aria-labelledby="titulo-recibo" className="flex flex-col gap-3 rounded-xl border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-recibo" className="text-lg font-semibold">
          Recibo de pago
        </h2>
        <span className="text-sm text-muted-foreground">{pedido.recibo}</span>
      </div>
      <dl className="flex flex-col gap-1.5 text-sm">
        {fila("Valor del pescado", pedido.total)}
        {fila("Comisión de servicio 5 %", pedido.comision)}
        {fila("Total pagado", pedido.total_pagado, true)}
        {pedido.pago_estado === "liberado" && fila("Recibe el pescador", pedido.monto_pescador)}
        {(pedido.monto_reembolsado ?? 0) > 0 && fila("Reembolsado", pedido.monto_reembolsado)}
      </dl>
      <p className="rounded-md bg-muted px-3 py-2 text-sm font-medium">{textoPago(pedido)}</p>
    </section>
  );
}
