import { Cargando } from "@/components/cargando";
import { FormularioPublicar } from "@/components/formulario-publicar";
import { Button } from "@/components/ui/button";
import { horaLocalSonora } from "@/lib/publicar";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { FilaEspecie } from "@/lib/tipos";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Publicar captura" };

export default function PaginaPublicar() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-bold">Publicar captura</h1>
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </div>
  );
}

// Lee la sesión, por eso va dentro de <Suspense>.
async function Contenido() {
  const perfil = await exigirRol(["pescador"]);

  // El aviso de cuenta pendiente ya lo pinta el layout de /pescador.
  if (perfil.estado !== "aprobado") {
    return (
      <div className="flex flex-col items-start gap-3">
        {perfil.estado === "rechazado" && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Tu cuenta no está aprobada para publicar.
          </p>
        )}
        <Link
          href="/pescador"
          className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline"
        >
          ← Volver a Mis capturas
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: especies, error } = await supabase
    .from("especies")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre")
    .overrideTypes<Pick<FilaEspecie, "id" | "nombre">[], { merge: false }>();

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
      >
        <p>No pudimos cargar las especies. Revisa tu conexión e inténtalo de nuevo.</p>
        <Button asChild variant="outline" className="h-11">
          <a href="/pescador/publicar">Reintentar</a>
        </Button>
      </div>
    );
  }

  // La hora inicial sale del servidor para que coincida al hidratar.
  return (
    <FormularioPublicar
      especies={especies ?? []}
      usuarioId={perfil.id}
      horaInicial={horaLocalSonora(new Date())}
    />
  );
}
