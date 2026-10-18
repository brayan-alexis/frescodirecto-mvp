import { FormularioPedido } from "@/components/formulario-pedido";
import { FotoCaptura } from "@/components/foto-captura";
import { Aviso } from "@/components/fd/aviso";
import { BarraAccion } from "@/components/fd/barra-accion";
import { BotonEnlace } from "@/components/fd/boton";
import { ErrorCarga } from "@/components/fd/error-carga";
import { HoraCaptura } from "@/components/fd/hora-captura";
import { formatoDinero, formatoKg, formatoReputacion, horaSonora } from "@/lib/formato";
import { urlFoto } from "@/lib/fotos";
import { esUuid } from "@/lib/rutas";
import { obtenerPerfil, type Perfil } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { DetalleCaptura } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Detalle de captura" };

// Con 5 kg o menos el número se pinta en alerta y lo acompaña "Quedan pocos kg.".
const KG_POCOS = 5;

type Props = {
  params: Promise<{ id: string }>;
};

export default function PaginaCaptura({ params }: Props) {
  return (
    <Suspense fallback={<EsqueletoDetalle />}>
      <Detalle params={params} />
    </Suspense>
  );
}

// Lee el id de la ruta y la sesión, por eso va dentro de <Suspense>.
async function Detalle({ params }: Props) {
  const { id } = await params;
  if (!esUuid(id)) notFound();

  const supabase = await createClient();
  const [perfil, { data: captura, error }] = await Promise.all([
    obtenerPerfil(),
    supabase.rpc("detalle_captura", { p_id: id }).maybeSingle<DetalleCaptura>(),
  ]);

  if (error) return <ErrorCarga titulo="No pudimos cargar la captura" href={`/captura/${id}`} />;
  if (!captura) notFound();

  const pocos = captura.kg_disponibles <= KG_POCOS;

  return (
    // Sin padding propio: la foto y los bloques llegan de orilla a orilla con -mx-4,
    // y la barra de acción fija tiene al artículo completo como contenedor.
    <article className="flex flex-col">
      <div className="-mx-4 -mt-6">
        <FotoCaptura src={urlFoto(supabase, captura.foto_path)} alt={`Foto de ${captura.especie}`} variante="portada" />
      </div>

      <section aria-labelledby="titulo-captura" className="-mx-4 flex flex-col gap-4 bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 id="titulo-captura" className="font-display text-[26px] font-bold leading-8 text-ink">
              {captura.especie}
            </h1>
            <p className="flex items-start gap-1 text-sm text-ink-muted">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                {captura.pescador}
                {captura.cooperativa && ` · ${captura.cooperativa}`}
              </span>
            </p>
            <p className="text-sm font-bold text-ink">
              {formatoReputacion(captura.calificacion, captura.num_calificaciones, "larga")}
            </p>
          </div>
          <p className="flex shrink-0 flex-col items-end">
            <span className="text-[28px] font-extrabold leading-8 tabular-nums text-ink">
              {formatoDinero(captura.precio_kg)}
            </span>
            <span className="text-[13px] text-ink-muted">por kg</span>
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5 rounded-md bg-surface-sunken p-3">
            <dt className="text-[13px] text-ink-muted">Disponibles</dt>
            <dd className={cn("text-lg font-bold tabular-nums", pocos ? "text-alerta" : "text-ink")}>
              {formatoKg(captura.kg_disponibles)}
            </dd>
            {pocos && <dd className="text-[13px] font-bold text-alerta">Quedan pocos kg.</dd>}
          </div>
          <div className="flex flex-col gap-0.5 rounded-md bg-surface-sunken p-3">
            <dt className="text-[13px] text-ink-muted">Hora de captura</dt>
            <dd className="text-lg font-bold tabular-nums text-ink">{horaSonora(captura.capturada_en)}</dd>
          </div>
        </dl>

        <HoraCaptura capturadaEn={captura.capturada_en} conNota />

        {captura.notas && <p className="text-sm text-ink">{captura.notas}</p>}
      </section>

      {captura.disponible ? (
        <ZonaPedido perfil={perfil} captura={captura} />
      ) : (
        <Aviso tono="alerta" titulo="Esta captura ya no está disponible." className="mt-6">
          <BotonEnlace variante="secundario" href="/" className="mt-3">
            Ver catálogo
          </BotonEnlace>
        </Aviso>
      )}
    </article>
  );
}

// Solo el restaurante pide; el visitante ve cómo entrar y el pescador o el admin, nada.
function ZonaPedido({ perfil, captura }: { perfil: Perfil | null; captura: DetalleCaptura }) {
  if (!perfil) {
    return (
      <BarraAccion>
        <BotonEnlace href={`/login?next=/captura/${captura.id}`} bloque>
          Entrar para pedir
        </BotonEnlace>
      </BarraAccion>
    );
  }
  if (perfil.rol === "restaurante") {
    return (
      <FormularioPedido
        capturaId={captura.id}
        especie={captura.especie}
        precioKg={captura.precio_kg}
        kgDisponibles={captura.kg_disponibles}
      />
    );
  }
  return null;
}

function EsqueletoDetalle() {
  const bloque = "rounded bg-surface-sunken motion-safe:animate-pulse";
  return (
    <div className="flex flex-col">
      <p role="status" className="sr-only">
        Cargando captura…
      </p>
      <div aria-hidden className="-mx-4 -mt-6 h-[200px] bg-surface-sunken motion-safe:animate-pulse" />
      <div aria-hidden className="-mx-4 flex flex-col gap-3 bg-surface p-4">
        <div className={`h-8 w-40 ${bloque}`} />
        <div className={`h-4 w-56 ${bloque}`} />
        <div className="grid grid-cols-2 gap-3">
          <div className={`h-16 ${bloque}`} />
          <div className={`h-16 ${bloque}`} />
        </div>
      </div>
    </div>
  );
}
