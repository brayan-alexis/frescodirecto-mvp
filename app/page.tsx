import { BotonEnlace } from "@/components/fd/boton";
import { ErrorCarga } from "@/components/fd/error-carga";
import { EsqueletoTarjetas } from "@/components/fd/esqueleto-tarjetas";
import { EstadoVacio } from "@/components/fd/estado-vacio";
import { TarjetaCaptura } from "@/components/fd/tarjeta-captura";
import { FiltrosCatalogo } from "@/components/filtros-catalogo";
import { hayFiltros, leerFiltros, urlCatalogo } from "@/lib/filtros-catalogo";
import { fechaLarga } from "@/lib/formato";
import { urlFoto } from "@/lib/fotos";
import { createClient } from "@/lib/supabase/server";
import type { CapturaCatalogo, FilaEspecie } from "@/lib/tipos";
import { Fish, RotateCw } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

// La plantilla del layout no aplica a la página de su mismo segmento: va completo.
export const metadata: Metadata = { title: { absolute: "Catálogo de hoy · FrescoDirecto" } };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function Inicio({ searchParams }: Props) {
  return (
    <div className="flex flex-col">
      <Suspense fallback={<EsqueletoCatalogo />}>
        <Catalogo searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function Titulo({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-0.5 pb-3">
      <h1 className="font-display text-[26px] font-bold leading-8 text-ink">Pescado del día</h1>
      {children}
    </header>
  );
}

// Lee los filtros de la URL, por eso va dentro de <Suspense>.
// La función ya aplica la regla de 24 h, kg > 0, pescador aprobado y el orden.
async function Catalogo({ searchParams }: Props) {
  const filtros = leerFiltros(await searchParams);
  const supabase = await createClient();
  const [especies, catalogo] = await Promise.all([
    supabase
      .from("especies")
      .select("id, nombre")
      .eq("activa", true)
      .order("nombre")
      .overrideTypes<Pick<FilaEspecie, "id" | "nombre">[], { merge: false }>(),
    supabase.rpc("catalogo_del_dia", {
      p_especie_id: filtros.especie,
      p_precio_max: filtros.precio,
      p_horas_max: filtros.horas,
    }),
  ]);

  if (especies.error || catalogo.error) {
    return (
      <>
        <Titulo />
        <ErrorCarga titulo="No pudimos cargar las capturas" href={urlCatalogo(filtros)} />
      </>
    );
  }

  const capturas: CapturaCatalogo[] = catalogo.data ?? [];
  const filtrado = hayFiltros(filtros);
  // Después de leer la petición: con cacheComponents, la hora no se congela en el prerender.
  // Una sola hora para todas las tarjetas.
  const ahora = new Date();
  const conteo = filtrado
    ? `${capturas.length} ${capturas.length === 1 ? "captura" : "capturas"} con estos filtros`
    : `${capturas.length} ${capturas.length === 1 ? "captura publicada" : "capturas publicadas"}`;

  return (
    <>
      <Titulo>
        <p className="text-sm text-ink-muted">
          {fechaLarga(ahora)} · {conteo}
        </p>
      </Titulo>
      <FiltrosCatalogo especies={especies.data ?? []} filtros={filtros}>
        {capturas.length > 0 ? (
          <ul aria-label="Capturas de hoy" className="flex flex-col gap-3">
            {capturas.map((captura) => (
              <li key={captura.id}>
                <TarjetaCaptura captura={captura} foto={urlFoto(supabase, captura.foto_path)} ahora={ahora} />
              </li>
            ))}
          </ul>
        ) : filtrado ? (
          <EstadoVacio
            icono={Fish}
            titulo="No hay capturas con esos filtros."
            ayuda="Prueba con otra especie o un precio mayor."
            accion={
              <BotonEnlace variante="secundario" href="/">
                Quitar filtros
              </BotonEnlace>
            }
          />
        ) : (
          <EstadoVacio
            icono={Fish}
            titulo="Aún no hay capturas publicadas hoy"
            ayuda="Los pescadores publican desde temprano. Vuelve más tarde."
            accion={
              <BotonEnlace variante="secundario" href="/" icono={RotateCw}>
                Actualizar
              </BotonEnlace>
            }
          />
        )}
      </FiltrosCatalogo>
      <p className="pt-6 text-[13px] text-ink-muted">★ promedio con 3 o más calificaciones; si no, Nuevo.</p>
    </>
  );
}

function EsqueletoCatalogo() {
  return (
    <>
      <Titulo>
        <div aria-hidden className="h-5 w-56 rounded bg-surface-sunken motion-safe:animate-pulse" />
      </Titulo>
      <div aria-hidden className="-mx-4 flex gap-2 bg-surface-sunken px-4 py-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 w-20 rounded-full bg-surface motion-safe:animate-pulse" />
        ))}
      </div>
      <div className="pt-4">
        <EsqueletoTarjetas texto="Cargando capturas…" />
      </div>
    </>
  );
}
