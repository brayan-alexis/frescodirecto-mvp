import { FotoCaptura } from "@/components/foto-captura";
import { Button } from "@/components/ui/button";
import { formatoDinero, formatoKg, formatoReputacion, haceCuanto, horaSonora } from "@/lib/formato";
import { urlFoto } from "@/lib/fotos";
import { esUuid } from "@/lib/rutas";
import { obtenerPerfil, type Perfil } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { DetalleCaptura } from "@/lib/tipos";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

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

  if (error) {
    return (
      <div
        role="alert"
        className="mx-auto flex max-w-xl flex-col items-start gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
      >
        <p>No pudimos cargar la captura. Revisa tu conexión e inténtalo de nuevo.</p>
        <Button asChild variant="outline" className="h-11">
          <a href={`/captura/${id}`}>Reintentar</a>
        </Button>
      </div>
    );
  }
  if (!captura) notFound();

  return (
    <article className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <FotoCaptura
        src={urlFoto(supabase, captura.foto_path)}
        alt={`Foto de ${captura.especie}`}
        variante="grande"
      />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{captura.especie}</h1>
        <p className="text-2xl font-bold">{formatoKg(captura.kg_disponibles)} disponibles</p>
        <p>
          {formatoDinero(captura.precio_kg)}/kg · {haceCuanto(captura.horas_desde_captura)}
        </p>
      </div>
      <section aria-label="Pescador" className="flex flex-col gap-0.5 rounded-xl border p-3 text-sm">
        <p className="text-base font-medium">{captura.pescador}</p>
        {captura.cooperativa && <p className="text-muted-foreground">{captura.cooperativa}</p>}
        <p>{formatoReputacion(captura.calificacion, captura.num_calificaciones, "larga")}</p>
      </section>
      {captura.notas && <p>{captura.notas}</p>}
      <p className="text-sm text-muted-foreground">
        Capturada {horaSonora(captura.capturada_en)} (hora de Sonora)
      </p>
      {captura.disponible ? (
        <ZonaPedido perfil={perfil} capturaId={captura.id} />
      ) : (
        <p
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
        >
          Esta captura ya no está disponible.
        </p>
      )}
      <Link href="/" className="inline-flex min-h-11 items-center self-start text-sm font-medium underline-offset-4 hover:underline">
        ← Volver al catálogo
      </Link>
    </article>
  );
}

// Provisional hasta la tarea 04, que pone aquí el formulario de pedido del restaurante.
function ZonaPedido({ perfil, capturaId }: { perfil: Perfil | null; capturaId: string }) {
  if (!perfil) {
    return (
      <Button asChild className="h-11">
        <Link href={`/login?next=/captura/${capturaId}`}>Inicia sesión para pedir</Link>
      </Button>
    );
  }
  if (perfil.rol === "restaurante") {
    return <p className="text-sm text-muted-foreground">El formulario de pedido llega en la tarea 04</p>;
  }
  return null;
}

function EsqueletoDetalle() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <p role="status" className="sr-only">
        Cargando captura…
      </p>
      <div aria-hidden className="aspect-[4/3] w-full rounded-xl bg-muted motion-safe:animate-pulse" />
      <div aria-hidden className="h-7 w-32 rounded bg-muted motion-safe:animate-pulse" />
      <div aria-hidden className="h-7 w-48 rounded bg-muted motion-safe:animate-pulse" />
      <div aria-hidden className="h-4 w-40 rounded bg-muted motion-safe:animate-pulse" />
    </div>
  );
}
