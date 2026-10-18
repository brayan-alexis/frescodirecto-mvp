import { AvisoAccionProvider } from "@/components/aviso-accion";
import { AvisoModoPrueba } from "@/components/aviso-modo-prueba";
import { BotonActualizar } from "@/components/boton-actualizar";
import { BotonEnlace } from "@/components/fd/boton";
import { ErrorCarga } from "@/components/fd/error-carga";
import { EsqueletoTarjetas } from "@/components/fd/esqueleto-tarjetas";
import { EstadoVacio } from "@/components/fd/estado-vacio";
import { TarjetaPedido } from "@/components/fd/tarjeta-pedido";
import { TarjetaCalificacion } from "@/components/tarjeta-calificacion";
import { separarPorCalificar } from "@/lib/calificaciones";
import { MAX_HISTORIAL, separarPedidos } from "@/lib/seguimiento";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { MiPedido } from "@/lib/tipos";
import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Mis pedidos" };

export default function PaginaPedidos() {
  return (
    <Suspense fallback={<Esqueleto />}>
      <Contenido />
    </Suspense>
  );
}

function Titulo() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-[26px] font-bold leading-8 text-ink">Mis pedidos</h1>
      <BotonActualizar />
    </div>
  );
}

// mis_pedidos ya viene del más reciente al más antiguo, con pago y teléfono (solo si está activo).
async function Contenido() {
  await exigirRol(["restaurante"]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("mis_pedidos")
    .eq("mi_papel", "restaurante");

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <Titulo />
        <ErrorCarga titulo="No pudimos cargar tus pedidos" href="/pedidos" />
      </div>
    );
  }

  const pedidos: MiPedido[] = data ?? [];
  // Después de leer la sesión y mis_pedidos, así que la hora es de esta petición.
  const ahora = new Date();
  const { activos, historial } = separarPedidos(pedidos);
  const { recientes: porCalificar } = separarPorCalificar(pedidos, ahora);

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Titulo />
        <EstadoVacio
          icono={Receipt}
          titulo="Todavía no has hecho pedidos"
          ayuda="Elige una captura del día y paga en la app."
          accion={
            <BotonEnlace variante="secundario" href="/">
              Ver catálogo
            </BotonEnlace>
          }
        />
      </div>
    );
  }

  const lista = (filas: MiPedido[], etiqueta: string) => (
    <ul aria-label={etiqueta} className="flex flex-col gap-3">
      {filas.map((pedido) => (
        <li key={pedido.id}>
          <TarjetaPedido pedido={pedido} ahora={ahora} />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Titulo />
        <AvisoModoPrueba />
      </div>

      {/* La confirmación de una calificación aparece arriba de esta sección. */}
      {porCalificar.length > 0 && (
        <AvisoAccionProvider>
          <section aria-labelledby="titulo-por-calificar" className="flex flex-col gap-3">
            <h2 id="titulo-por-calificar" className="text-sm font-bold text-ink-muted">
              Por calificar ({porCalificar.length})
            </h2>
            <ul aria-label="Pedidos por calificar" className="flex flex-col gap-3">
              {porCalificar.map((pedido) => (
                <li key={pedido.id}>
                  <TarjetaCalificacion
                    pedidoId={pedido.id}
                    contraparte={pedido.contraparte}
                    titulo={`${pedido.folio} · ${pedido.especie}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        </AvisoAccionProvider>
      )}

      <section aria-labelledby="titulo-en-curso" className="flex flex-col gap-3">
        <h2 id="titulo-en-curso" className="text-sm font-bold text-ink-muted">
          En curso ({activos.length})
        </h2>
        {activos.length > 0 ? (
          lista(activos, "Pedidos en curso")
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-lg bg-surface-sunken px-4 py-4 text-sm text-ink">
            <p className="font-bold">No tienes pedidos en curso.</p>
            <BotonEnlace variante="secundario" href="/">
              Ver catálogo
            </BotonEnlace>
          </div>
        )}
      </section>

      {historial.length > 0 && (
        <section aria-labelledby="titulo-terminados" className="flex flex-col gap-3">
          <h2 id="titulo-terminados" className="text-sm font-bold text-ink-muted">
            Terminados ({historial.length === MAX_HISTORIAL ? `últimos ${MAX_HISTORIAL}` : historial.length})
          </h2>
          {lista(historial, "Pedidos terminados")}
        </section>
      )}
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="flex flex-col gap-4">
      <Titulo />
      <EsqueletoTarjetas texto="Cargando tus pedidos…" conFoto={false} />
    </div>
  );
}
