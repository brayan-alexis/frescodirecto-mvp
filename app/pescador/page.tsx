import { TarjetaMiCaptura } from "@/components/tarjeta-mi-captura";
import { Aviso } from "@/components/fd/aviso";
import { BotonEnlace } from "@/components/fd/boton";
import { ErrorCarga } from "@/components/fd/error-carga";
import { EsqueletoTarjetas } from "@/components/fd/esqueleto-tarjetas";
import { EstadoVacio } from "@/components/fd/estado-vacio";
import { TarjetaCaptura } from "@/components/fd/tarjeta-captura";
import { estadoCaptura } from "@/lib/capturas";
import { formatoEstrellas, formatoReputacion, horaSonora } from "@/lib/formato";
import { urlFoto } from "@/lib/fotos";
import { exigirRol, type Perfil } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { MiCaptura, MiCalificacion, ReputacionPescador } from "@/lib/tipos";
import { ChevronDown, Fish, Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Mis capturas" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const MAX_HISTORIAL = 20;

export default function PaginaPescador({ searchParams }: Props) {
  return (
    <Suspense fallback={<Esqueleto />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

function Titulo() {
  return <h1 className="font-display text-[26px] font-bold leading-8 text-ink">Mis capturas</h1>;
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Titulo />
        {aprobado && (
          <BotonEnlace href="/pescador/publicar" bloque icono={Plus}>
            Publicar captura
          </BotonEnlace>
        )}
        {publicada === "1" && (
          <Aviso tono="exito" titulo="Captura publicada">
            <p>Ya aparece en el catálogo de hoy.</p>
          </Aviso>
        )}
      </div>

      {error ? (
        <ErrorCarga titulo="No pudimos cargar tus capturas" href="/pescador" />
      ) : (
        <ListaCapturas
          capturas={data ?? []}
          perfil={perfil}
          reputacion={reputacion.data}
          ahora={ahora}
          urlDe={(path) => urlFoto(supabase, path)}
          aprobado={aprobado}
        />
      )}

      {reputacion.error || calificaciones.error ? (
        <ErrorCarga titulo="No pudimos cargar tu reputación" href="/pescador" />
      ) : (
        <Reputacion reputacion={reputacion.data} calificaciones={calificaciones.data ?? []} />
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
  const conPromedio = reputacion.calificacion != null;
  return (
    <section
      aria-labelledby="titulo-reputacion"
      className="flex flex-col gap-3 rounded-lg bg-surface p-4 text-sm text-ink shadow-card"
    >
      <div className="flex flex-col gap-1">
        <h2 id="titulo-reputacion" className="text-sm font-bold text-ink-muted">
          Tu reputación
        </h2>
        <p className="text-lg font-bold tabular-nums">
          {formatoReputacion(reputacion.calificacion, reputacion.num_calificaciones, "larga")}
        </p>
        {!conPromedio && (
          <p className="text-ink-muted">
            El promedio se muestra con 3 calificaciones; llevas {reputacion.num_calificaciones}. Mientras tanto,
            el catálogo te muestra como Nuevo.
          </p>
        )}
      </div>

      {calificaciones.length > 0 && (
        <details className="group rounded-md bg-surface-sunken">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 rounded-md px-3 font-bold [&::-webkit-details-marker]:hidden">
            <span>
              Lo que dicen los restaurantes (
              {calificaciones.length === MAX_HISTORIAL ? `últimas ${MAX_HISTORIAL}` : calificaciones.length})
            </span>
            <ChevronDown aria-hidden className="size-5 shrink-0 group-open:rotate-180" />
          </summary>
          <ul aria-label="Calificaciones recibidas" className="flex flex-col divide-y divide-line px-3 pb-1">
            {calificaciones.map((c) => (
              <li key={c.folio} className="flex flex-col gap-0.5 py-3">
                <p className="font-bold">
                  <span role="img" aria-label={`${c.estrellas} de 5 estrellas`} className="text-alerta">
                    {formatoEstrellas(c.estrellas)}
                  </span>{" "}
                  · {c.restaurante}
                </p>
                <p>{c.comentario ?? <span className="text-ink-muted">Sin comentario</span>}</p>
                <p className="text-[13px] text-ink-muted">
                  <span className="font-mono">{c.folio}</span> · {c.especie} · {horaSonora(c.creado_en)}
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
  perfil,
  reputacion,
  ahora,
  urlDe,
  aprobado,
}: {
  capturas: MiCaptura[];
  perfil: Perfil;
  reputacion: ReputacionPescador | null;
  ahora: Date;
  urlDe: (path: string) => string | null;
  aprobado: boolean;
}) {
  const activas = capturas.filter((c) => estadoCaptura(c, ahora) === "activa");
  const historial = capturas
    .filter((c) => estadoCaptura(c, ahora) !== "activa")
    .slice(0, MAX_HISTORIAL);

  return (
    <>
      <section aria-labelledby="titulo-activas" className="flex flex-col gap-3">
        <h2 id="titulo-activas" className="text-sm font-bold text-ink-muted">
          En el catálogo ({activas.length})
        </h2>
        {activas.length > 0 ? (
          <ul aria-label="Capturas en el catálogo" className="flex flex-col gap-3">
            {activas.map((c) => (
              <li key={c.id}>
                {/* La misma tarjeta que ven los restaurantes, sin enlace y con "18 de 30 kg". */}
                <TarjetaCaptura
                  captura={{
                    id: c.id,
                    especie: c.especies?.nombre ?? "Especie",
                    pescador: perfil.nombre,
                    cooperativa: perfil.negocio,
                    kg_disponibles: c.kg_disponibles,
                    kg_publicados: c.kg_publicados,
                    precio_kg: c.precio_kg,
                    capturada_en: c.capturada_en,
                    calificacion: reputacion?.calificacion ?? null,
                    num_calificaciones: reputacion?.num_calificaciones ?? 0,
                  }}
                  foto={urlDe(c.foto_path)}
                  ahora={ahora}
                  conPublicados
                  href={null}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EstadoVacio
            icono={Fish}
            titulo="Aún no publicas capturas hoy"
            ayuda="Lo que publiques aparece en el catálogo durante 24 h."
            accion={
              aprobado && (
                <BotonEnlace variante="secundario" href="/pescador/publicar" icono={Plus}>
                  Publicar captura
                </BotonEnlace>
              )
            }
          />
        )}
      </section>

      {historial.length > 0 && (
        <details className="group flex flex-col">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 rounded-md text-sm font-bold text-ink-muted [&::-webkit-details-marker]:hidden">
            <span>
              Historial ({historial.length === MAX_HISTORIAL ? `últimas ${MAX_HISTORIAL}` : historial.length})
            </span>
            <ChevronDown aria-hidden className="size-5 shrink-0 group-open:rotate-180" />
          </summary>
          <ul aria-label="Historial de capturas" className="mt-1 flex flex-col gap-3">
            {historial.map((c) => (
              <li key={c.id}>
                <TarjetaMiCaptura captura={c} foto={urlDe(c.foto_path)} ahora={ahora} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function Esqueleto() {
  return (
    <div className="flex flex-col gap-4">
      <Titulo />
      <EsqueletoTarjetas texto="Cargando tus capturas…" />
    </div>
  );
}
