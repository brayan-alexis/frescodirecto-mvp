import { EsqueletoLista } from "@/components/esqueleto-lista";
import { FiltrosCatalogo } from "@/components/filtros-catalogo";
import { TarjetaCaptura } from "@/components/tarjeta-captura";
import { Button } from "@/components/ui/button";
import { hayFiltros, leerFiltros, urlCatalogo } from "@/lib/filtros-catalogo";
import { urlFoto } from "@/lib/fotos";
import { createClient } from "@/lib/supabase/server";
import type { CapturaCatalogo, FilaEspecie } from "@/lib/tipos";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

// La plantilla del layout no aplica a la página de su mismo segmento: va completo.
export const metadata: Metadata = { title: { absolute: "Catálogo de hoy · FrescoDirecto" } };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function Inicio({ searchParams }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Catálogo de hoy</h1>
      <Suspense fallback={<EsqueletoCatalogo />}>
        <Catalogo searchParams={searchParams} />
      </Suspense>
      <p className="text-xs text-muted-foreground">
        ★ promedio con 3 o más calificaciones; si no, Nuevo.
      </p>
    </div>
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
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
      >
        <p>No pudimos cargar las capturas. Revisa tu conexión e inténtalo de nuevo.</p>
        <Button asChild variant="outline" className="h-11">
          <a href={urlCatalogo(filtros)}>Reintentar</a>
        </Button>
      </div>
    );
  }

  const capturas: CapturaCatalogo[] = catalogo.data ?? [];

  return (
    <FiltrosCatalogo especies={especies.data ?? []} filtros={filtros}>
      {capturas.length > 0 ? (
        <ul aria-label="Capturas de hoy" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {capturas.map((captura) => (
            <li key={captura.id}>
              <TarjetaCaptura captura={captura} foto={urlFoto(supabase, captura.foto_path)} />
            </li>
          ))}
        </ul>
      ) : hayFiltros(filtros) ? (
        <EstadoVacio texto="No hay capturas con esos filtros.">
          <Button asChild className="h-11">
            <Link href="/">Quitar filtros</Link>
          </Button>
        </EstadoVacio>
      ) : (
        <EstadoVacio texto="Aún no hay capturas hoy.">
          <p className="text-sm text-muted-foreground">
            Los pescadores publican desde temprano; vuelve a revisar más tarde.
          </p>
          <Button asChild variant="outline" className="h-11">
            <Link href="/">Actualizar</Link>
          </Button>
        </EstadoVacio>
      )}
    </FiltrosCatalogo>
  );
}

function EstadoVacio({ texto, children }: { texto: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed px-4 py-6">
      <p className="font-medium">{texto}</p>
      {children}
    </div>
  );
}

function EsqueletoCatalogo() {
  return (
    <div className="flex flex-col gap-4">
      <div aria-hidden className="flex flex-wrap gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 w-24 rounded-full bg-muted motion-safe:animate-pulse" />
        ))}
      </div>
      <EsqueletoLista texto="Cargando capturas…" columnas="sm:grid-cols-2 lg:grid-cols-3" />
    </div>
  );
}
