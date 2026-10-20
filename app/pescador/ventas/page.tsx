import { AvisoAccionProvider } from "@/components/aviso-accion";
import { AvisoModoPrueba } from "@/components/aviso-modo-prueba";
import { BotonActualizar } from "@/components/boton-actualizar";
import { TarjetaVenta, TarjetaVentaCompacta } from "@/components/tarjeta-venta";
import { BotonEnlace } from "@/components/fd/boton";
import { ErrorCarga } from "@/components/fd/error-carga";
import { EsqueletoTarjetas } from "@/components/fd/esqueleto-tarjetas";
import { EstadoVacio } from "@/components/fd/estado-vacio";
import { formatoDinero } from "@/lib/formato";
import { MAX_HISTORIAL, resumenHoy, resumenVentas, separarPedidos } from "@/lib/seguimiento";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { MiPedido } from "@/lib/tipos";
import { Plus, Receipt } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Ventas" };

export default function PaginaVentas() {
  return (
    <Suspense fallback={<Esqueleto />}>
      <Contenido />
    </Suspense>
  );
}

function Titulo() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-[26px] font-bold leading-8 text-ink">Ventas</h1>
      <BotonActualizar />
    </div>
  );
}

// mis_pedidos ya viene del más reciente al más antiguo, con pago y teléfono (solo si está activo).
async function Contenido() {
  const perfil = await exigirRol(["pescador"]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("mis_pedidos")
    .eq("mi_papel", "pescador");

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <Titulo />
        <ErrorCarga titulo="No pudimos cargar tus ventas" href="/pescador/ventas" />
      </div>
    );
  }

  const pedidos: MiPedido[] = data ?? [];
  // Después de leer la sesión y mis_pedidos, así que la hora es de esta petición.
  const ahora = new Date();

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Titulo />
        <EstadoVacio
          icono={Receipt}
          titulo="Aún no tienes pedidos"
          ayuda="Cuando una marisquería pida de tu captura, el pedido aparece aquí."
          accion={
            perfil.estado === "aprobado" && (
              <BotonEnlace variante="secundario" href="/pescador/publicar" icono={Plus}>
                Publicar captura
              </BotonEnlace>
            )
          }
        />
      </div>
    );
  }

  // Solo sumas para mostrar: cada monto viene de mis_pedidos.
  const { porCobrar, cobrado } = resumenVentas(pedidos);
  const hoy = resumenHoy(pedidos, ahora);
  const { activos, historial } = separarPedidos(pedidos);
  const porResponder = activos.filter((p) => p.estado === "solicitado");
  const enCurso = activos.filter((p) => p.estado !== "solicitado");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Titulo />
          <p className="text-sm text-ink-muted">
            Hoy · {hoy.pedidos} {hoy.pedidos === 1 ? "pedido" : "pedidos"} ·{" "}
            <span className="tabular-nums">{formatoDinero(hoy.total)}</span> en pedidos
          </p>
        </div>
        <AvisoModoPrueba />
        <dl aria-label="Resumen de pagos" className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 rounded-lg bg-surface p-3 shadow-card">
            <dt className="text-[13px] text-ink-muted">Por cobrar (retenido)</dt>
            <dd className="text-xl font-extrabold tabular-nums text-ink">{formatoDinero(porCobrar)}</dd>
          </div>
          <div className="flex flex-col gap-1 rounded-lg bg-surface p-3 shadow-card">
            <dt className="text-[13px] text-ink-muted">Cobrado</dt>
            <dd className="text-xl font-extrabold tabular-nums text-ink">{formatoDinero(cobrado)}</dd>
          </div>
        </dl>
      </div>

      {/* La confirmación de Aceptar, Rechazar o Marcar entregado aparece arriba de las secciones. */}
      <AvisoAccionProvider>
        <Seccion id="por-responder" titulo={`Por responder (${porResponder.length})`}>
          {porResponder.length > 0 ? (
            <Lista pedidos={porResponder} ahora={ahora} etiqueta="Pedidos por responder" />
          ) : (
            <p className="text-sm text-ink-muted">No tienes pedidos por responder.</p>
          )}
        </Seccion>

        <Seccion id="en-curso" titulo={`En curso (${enCurso.length})`}>
          {enCurso.length > 0 ? (
            <Lista pedidos={enCurso} ahora={ahora} etiqueta="Pedidos en curso" />
          ) : (
            <p className="text-sm text-ink-muted">No tienes pedidos en curso.</p>
          )}
        </Seccion>

        {historial.length > 0 && (
          <Seccion
            id="terminados"
            titulo={`Terminados (${historial.length === MAX_HISTORIAL ? `últimos ${MAX_HISTORIAL}` : historial.length})`}
          >
            <ul aria-label="Pedidos terminados" className="flex flex-col gap-3">
              {historial.map((pedido) => (
                <li key={pedido.id}>
                  <TarjetaVentaCompacta pedido={pedido} ahora={ahora} />
                </li>
              ))}
            </ul>
          </Seccion>
        )}
      </AvisoAccionProvider>
    </div>
  );
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`titulo-${id}`} className="flex flex-col gap-3">
      <h2 id={`titulo-${id}`} className="text-sm font-bold text-ink-muted">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Lista({ pedidos, ahora, etiqueta }: { pedidos: MiPedido[]; ahora: Date; etiqueta: string }) {
  return (
    <ul aria-label={etiqueta} className="flex flex-col gap-3">
      {pedidos.map((pedido) => (
        <li key={pedido.id}>
          <TarjetaVenta pedido={pedido} ahora={ahora} />
        </li>
      ))}
    </ul>
  );
}

function Esqueleto() {
  return (
    <div className="flex flex-col gap-4">
      <Titulo />
      <EsqueletoTarjetas texto="Cargando tus ventas…" conFoto={false} />
    </div>
  );
}
