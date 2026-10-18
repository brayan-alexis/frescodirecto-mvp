import { AccionesPendiente } from "@/components/acciones-pendiente";
import { AvisoAccionProvider } from "@/components/aviso-accion";
import { AvisoModoPrueba } from "@/components/aviso-modo-prueba";
import { BotonActualizar } from "@/components/boton-actualizar";
import { ReiniciarDemo } from "@/components/reiniciar-demo";
import { ResolverDisputa } from "@/components/resolver-disputa";
import { Aviso } from "@/components/fd/aviso";
import { ErrorCarga } from "@/components/fd/error-carga";
import { EsqueletoTarjetas } from "@/components/fd/esqueleto-tarjetas";
import { formatoDinero, formatoKg, horaSonora } from "@/lib/formato";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { DisputaAbierta, FilaPerfil } from "@/lib/tipos";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Administración" };

type PerfilPendiente = Pick<FilaPerfil, "id" | "nombre" | "negocio" | "telefono" | "creado_en">;

const TARJETA = "rounded-lg bg-surface p-4 shadow-card";

export default function PaginaAdmin() {
  return (
    <Suspense fallback={<Esqueleto />}>
      <Contenido />
    </Suspense>
  );
}

function Titulo() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-[26px] font-bold leading-8 text-ink">Administración</h1>
      <BotonActualizar />
    </div>
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
  // Después de leer la sesión y los datos, así que la hora es de esta petición.
  const ahora = new Date();

  return (
    <AvisoAccionProvider>
      <div className="flex flex-col gap-6">
        <Titulo />

        <section aria-labelledby="titulo-pendientes" className="flex flex-col gap-3">
          <h2 id="titulo-pendientes" className="text-sm font-bold text-ink-muted">
            Pescadores pendientes{!pendientes.error && ` (${listaPendientes.length})`}
          </h2>
          {pendientes.error ? (
            <ErrorCarga titulo="No pudimos cargar los pescadores pendientes" href="/admin" />
          ) : listaPendientes.length === 0 ? (
            <Vacio texto="No hay pescadores pendientes." />
          ) : (
            <ul aria-label="Pescadores pendientes" className="flex flex-col gap-3">
              {listaPendientes.map((p) => (
                <li key={p.id}>
                  <article className={`${TARJETA} flex flex-col gap-3`}>
                    <div className="flex flex-col gap-0.5 text-sm text-ink">
                      <h3 className="text-base font-bold">{p.nombre}</h3>
                      {p.negocio && <p>{p.negocio}</p>}
                      {p.telefono && <p className="tabular-nums">Tel. {p.telefono}</p>}
                      <p className="text-[13px] text-ink-muted">Se registró {horaSonora(p.creado_en, ahora)}</p>
                    </div>
                    <AccionesPendiente perfilId={p.id} nombre={p.nombre} />
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="titulo-disputas" className="flex flex-col gap-3">
          <h2 id="titulo-disputas" className="text-sm font-bold text-ink-muted">
            Disputas de pago{!disputas.error && ` (${listaDisputas.length})`}
          </h2>
          <AvisoModoPrueba />
          {disputas.error ? (
            <ErrorCarga titulo="No pudimos cargar las disputas" href="/admin" />
          ) : listaDisputas.length === 0 ? (
            <Vacio texto="No hay disputas abiertas." />
          ) : (
            <ul aria-label="Disputas abiertas" className="flex flex-col gap-3">
              {listaDisputas.map((d) => (
                <li key={d.pedido_id}>
                  <article className={`${TARJETA} flex flex-col gap-4 text-sm text-ink`}>
                    <div className="flex flex-col gap-0.5">
                      <p className="font-mono text-sm font-semibold text-ink-muted">{d.folio}</p>
                      <h3 className="text-base font-bold">
                        {d.especie} · {formatoKg(d.kg)}
                      </h3>
                      <p className="text-[13px] text-ink-muted">
                        Recibo <span className="font-mono">{d.recibo}</span>
                      </p>
                      <p>
                        {d.restaurante} → {d.pescador}
                      </p>
                    </div>
                    <dl className="flex flex-col gap-1">
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-muted">Valor del pescado</dt>
                        <dd className="font-bold tabular-nums">{formatoDinero(d.subtotal)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-muted">Comisión de servicio 5 %</dt>
                        <dd className="font-bold tabular-nums">{formatoDinero(d.comision)}</dd>
                      </div>
                    </dl>
                    <Aviso tono="error" titulo="Incidencia">
                      <p>{d.nota_incidencia ?? "Sin descripción"}</p>
                      <p className="mt-1 text-[13px]">
                        Reportada <span className="font-mono">{horaSonora(d.reportado_en, ahora)}</span> (hora de
                        Sonora)
                      </p>
                    </Aviso>
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

        {/* La nav inferior del admin enlaza aquí: /admin#reiniciar-demo. */}
        <section
          id="reiniciar-demo"
          aria-labelledby="titulo-demo"
          className={`${TARJETA} flex scroll-mt-4 flex-col gap-3`}
        >
          <h2 id="titulo-demo" className="text-lg font-bold text-ink">
            Escenario demo
          </h2>
          <p className="text-sm text-ink-muted">
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
    <div className="flex flex-col items-start gap-3 rounded-lg bg-surface-sunken px-4 py-4 text-sm text-ink">
      <p className="font-bold">{texto}</p>
      <BotonActualizar />
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="flex flex-col gap-4">
      <Titulo />
      <EsqueletoTarjetas texto="Cargando la administración…" conFoto={false} />
    </div>
  );
}
