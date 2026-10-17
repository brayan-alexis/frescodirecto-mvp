import { AccionesPendiente } from "@/components/acciones-pendiente";
import { AvisoAccionProvider } from "@/components/aviso-accion";
import { AvisoModoPrueba } from "@/components/aviso-modo-prueba";
import { BotonActualizar } from "@/components/boton-actualizar";
import { EsqueletoLista } from "@/components/esqueleto-lista";
import { ReiniciarDemo } from "@/components/reiniciar-demo";
import { ResolverDisputa } from "@/components/resolver-disputa";
import { Button } from "@/components/ui/button";
import { formatoDinero, formatoKg, horaSonora } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { DisputaAbierta, FilaPerfil } from "@/lib/tipos";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Administración" };

type PerfilPendiente = Pick<FilaPerfil, "id" | "nombre" | "negocio" | "telefono" | "creado_en">;

export default function PaginaAdmin() {
  return (
    <Suspense fallback={<EsqueletoLista texto="Cargando la administración…" />}>
      <Contenido />
    </Suspense>
  );
}

// El admin puede leer todos los perfiles; disputas_abiertas vuelve a validar el rol.
async function Contenido() {
  await exigirRol(["admin"]);

  const supabase = await createClient();
  const [pendientes, disputas] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre, negocio, telefono, creado_en")
      .eq("rol", "pescador")
      .eq("estado", "pendiente")
      .order("creado_en")
      .overrideTypes<PerfilPendiente[], { merge: false }>(),
    supabase.rpc("disputas_abiertas"),
  ]);
  const listaPendientes: PerfilPendiente[] = pendientes.data ?? [];
  const listaDisputas: DisputaAbierta[] = disputas.data ?? [];

  return (
    <AvisoAccionProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Administración</h1>
          <BotonActualizar />
        </div>

        <section aria-labelledby="titulo-pendientes" className="flex flex-col gap-3">
          <h2 id="titulo-pendientes" className="text-lg font-semibold">
            Pescadores pendientes{!pendientes.error && ` (${listaPendientes.length})`}
          </h2>
          {pendientes.error ? (
            <ErrorCarga texto="No pudimos cargar los pescadores pendientes." />
          ) : listaPendientes.length === 0 ? (
            <Vacio texto="No hay pescadores pendientes." />
          ) : (
            <ul aria-label="Pescadores pendientes" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {listaPendientes.map((p) => (
                <li key={p.id}>
                  <article className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-base font-semibold">{p.nombre}</h3>
                      {p.negocio && <p>{p.negocio}</p>}
                      {p.telefono && <p>Tel. {p.telefono}</p>}
                      <p className="text-muted-foreground">Se registró {horaSonora(p.creado_en)}</p>
                    </div>
                    <AccionesPendiente perfilId={p.id} nombre={p.nombre} />
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="titulo-disputas" className="flex flex-col gap-3">
          <h2 id="titulo-disputas" className="text-lg font-semibold">
            Disputas de pago{!disputas.error && ` (${listaDisputas.length})`}
          </h2>
          <AvisoModoPrueba />
          {disputas.error ? (
            <ErrorCarga texto="No pudimos cargar las disputas." />
          ) : listaDisputas.length === 0 ? (
            <Vacio texto="No hay disputas abiertas." />
          ) : (
            <ul aria-label="Disputas abiertas" className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {listaDisputas.map((d) => (
                <li key={d.pedido_id}>
                  <article className="flex flex-col gap-3 rounded-xl border bg-card p-3 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-base font-semibold">
                        {d.folio} · {d.especie} · {formatoKg(d.kg)}
                      </h3>
                      <p className="text-muted-foreground">Recibo {d.recibo}</p>
                      <p>
                        {d.restaurante} → {d.pescador}
                      </p>
                    </div>
                    <dl className="flex flex-col gap-1">
                      <div className="flex justify-between gap-3">
                        <dt>Valor del pescado</dt>
                        <dd>{formatoDinero(d.subtotal)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt>Comisión de servicio 5 %</dt>
                        <dd>{formatoDinero(d.comision)}</dd>
                      </div>
                    </dl>
                    <p className="rounded-md border border-red-300 bg-red-50 p-3 text-red-900">
                      <strong>Incidencia:</strong> {d.nota_incidencia ?? "Sin descripción"}
                      <br />
                      <span className="text-red-800">Reportada {horaSonora(d.reportado_en)} (hora de Sonora)</span>
                    </p>
                    <ResolverDisputa
                      pedidoId={d.pedido_id}
                      folio={d.folio}
                      subtotal={d.subtotal}
                      comision={d.comision}
                      pescador={d.pescador}
                    />
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="titulo-demo" className="flex flex-col gap-3 rounded-xl border p-3">
          <h2 id="titulo-demo" className="text-lg font-semibold">
            Escenario demo
          </h2>
          <p className="text-sm text-muted-foreground">
            Vuelve a cargar las capturas, pedidos y disputas de las cuentas fd.*. Las demás cuentas no se tocan.
          </p>
          <ReiniciarDemo />
        </section>
      </div>
    </AvisoAccionProvider>
  );
}

function Vacio({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed px-4 py-6">
      <p className="font-medium">{texto}</p>
      <BotonActualizar />
    </div>
  );
}

function ErrorCarga({ texto }: { texto: string }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
    >
      <p>{texto} Revisa tu conexión e inténtalo de nuevo.</p>
      <Button asChild variant="outline" className="h-11">
        <a href="/admin">Reintentar</a>
      </Button>
    </div>
  );
}
