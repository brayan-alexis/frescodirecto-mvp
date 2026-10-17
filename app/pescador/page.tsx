import { Cargando } from "@/components/cargando";
import { TarjetaMiCaptura } from "@/components/tarjeta-mi-captura";
import { Button } from "@/components/ui/button";
import { estadoCaptura } from "@/lib/capturas";
import { formatoEstrellas, formatoReputacion, horaSonora } from "@/lib/formato";
import { urlFoto } from "@/lib/fotos";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { MiCaptura, MiCalificacion, ReputacionPescador } from "@/lib/tipos";
import Link from "next/link";
import { Suspense } from "react";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const MAX_HISTORIAL = 20;

export default function PaginaPescador({ searchParams }: Props) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

// Lee la sesión y ?publicada, por eso va dentro de <Suspense>.
async function Contenido({ searchParams }: Props) {
  const perfil = await exigirRol(["pescador"]);
  const { publicada } = await searchParams;
  const aprobado = perfil.estado === "aprobado";

  // La política "Capturas propias o admin" solo devuelve las del pescador.
  // mis_calificaciones solo devuelve las suyas, con comentario: no son públicas.
  const supabase = await createClient();
  const [{ data, error }, reputacion, calificaciones] = await Promise.all([
    supabase
      .from("capturas")
      .select("*, especies(nombre)")
      .order("publicada_en", { ascending: false })
      .limit(50)
      .overrideTypes<MiCaptura[], { merge: false }>(),
    supabase.rpc("reputacion_pescador", { p_pescador_id: perfil.id }).single<ReputacionPescador>(),
    supabase.rpc("mis_calificaciones").limit(MAX_HISTORIAL),
  ]);
  const ahora = new Date();

  const botonPublicar = aprobado && (
    <Button asChild className="h-11">
      <Link href="/pescador/publicar">Publicar captura</Link>
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mis capturas</h1>
        {botonPublicar}
      </div>

      {reputacion.error || calificaciones.error ? (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          No pudimos cargar tu reputación. Recarga la página para intentarlo de nuevo.
        </p>
      ) : (
        <Reputacion reputacion={reputacion.data} calificaciones={calificaciones.data ?? []} />
      )}

      {publicada === "1" && (
        <p
          role="status"
          className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          Captura publicada.
        </p>
      )}

      {error ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          <p>No pudimos cargar tus capturas. Revisa tu conexión e inténtalo de nuevo.</p>
          <Button asChild variant="outline" className="h-11">
            <a href="/pescador">Reintentar</a>
          </Button>
        </div>
      ) : (
        <ListaCapturas
          capturas={data ?? []}
          ahora={ahora}
          urlDe={(path) => urlFoto(supabase, path)}
          botonPublicar={botonPublicar}
        />
      )}
    </div>
  );
}

/** Promedio público (con 3 o más) y los comentarios, que solo ve el pescador dueño. */
function Reputacion({
  reputacion,
  calificaciones,
}: {
  reputacion: ReputacionPescador;
  calificaciones: MiCalificacion[];
}) {
  return (
    <section aria-labelledby="titulo-reputacion" className="flex flex-col gap-2 rounded-xl border p-3 text-sm">
      <h2 id="titulo-reputacion" className="text-base font-semibold">
        {reputacion.calificacion != null
          ? `Tu reputación: ${formatoReputacion(reputacion.calificacion, reputacion.num_calificaciones, "larga")}`
          : "Aún no tienes promedio público: se muestra con 3 calificaciones"}
      </h2>
      {reputacion.calificacion == null && (
        <p className="text-muted-foreground">
          Llevas {reputacion.num_calificaciones} de 3. Mientras tanto, el catálogo te muestra como Nuevo.
        </p>
      )}

      {calificaciones.length > 0 && (
        <details className="rounded-md border">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 font-semibold">
            Lo que dicen los restaurantes ({calificaciones.length === MAX_HISTORIAL ? `últimas ${MAX_HISTORIAL}` : calificaciones.length})
          </summary>
          <ul aria-label="Calificaciones recibidas" className="flex flex-col divide-y px-3 pb-1">
            {calificaciones.map((c) => (
              <li key={c.folio} className="flex flex-col gap-0.5 py-2">
                <p>
                  <span role="img" aria-label={`${c.estrellas} de 5 estrellas`} className="text-amber-600">
                    {formatoEstrellas(c.estrellas)}
                  </span>{" "}
                  · {c.restaurante}
                </p>
                <p>{c.comentario ?? <span className="text-muted-foreground">Sin comentario</span>}</p>
                <p className="text-muted-foreground">
                  {c.folio} · {c.especie} · {horaSonora(c.creado_en)}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function ListaCapturas({
  capturas,
  ahora,
  urlDe,
  botonPublicar,
}: {
  capturas: MiCaptura[];
  ahora: Date;
  urlDe: (path: string) => string | null;
  botonPublicar: React.ReactNode;
}) {
  const activas = capturas.filter((c) => estadoCaptura(c, ahora) === "activa");
  const historial = capturas
    .filter((c) => estadoCaptura(c, ahora) !== "activa")
    .slice(0, MAX_HISTORIAL);

  const lista = (filas: MiCaptura[], etiqueta: string) => (
    <ul aria-label={etiqueta} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {filas.map((captura) => (
        <li key={captura.id}>
          <TarjetaMiCaptura captura={captura} foto={urlDe(captura.foto_path)} ahora={ahora} />
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Activas</h2>
        {activas.length > 0 ? (
          lista(activas, "Capturas activas")
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed px-4 py-6">
            <p className="font-medium">
              {capturas.length > 0 ? "No tienes capturas activas hoy." : "Publica tu primera captura."}
            </p>
            {botonPublicar}
          </div>
        )}
      </section>

      {historial.length > 0 && (
        <details className="rounded-xl border">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 font-semibold">
            Historial ({historial.length === MAX_HISTORIAL ? `últimas ${MAX_HISTORIAL}` : historial.length})
          </summary>
          <div className="px-3 pb-3">{lista(historial, "Historial de capturas")}</div>
        </details>
      )}
    </>
  );
}
