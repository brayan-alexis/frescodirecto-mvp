import { Cargando } from "@/components/cargando";
import { FormularioPublicar } from "@/components/formulario-publicar";
import { Aviso } from "@/components/fd/aviso";
import { BotonEnlace } from "@/components/fd/boton";
import { ErrorCarga } from "@/components/fd/error-carga";
import { horaLocalSonora } from "@/lib/publicar";
import { exigirRol } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import type { FilaEspecie } from "@/lib/tipos";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Publicar captura" };

export default function PaginaPublicar() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-bold leading-8 text-ink">Publicar captura</h1>
        <p className="text-sm text-ink-muted">Aparece en el catálogo durante 24 h desde la hora de captura.</p>
      </div>
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </div>
  );
}

// Lee la sesión, por eso va dentro de <Suspense>.
async function Contenido() {
  const perfil = await exigirRol(["pescador"]);

  // Sin aprobación no hay formulario. El aviso de cuenta en revisión ya lo pinta el layout de /pescador.
  if (perfil.estado !== "aprobado") {
    return (
      <div className="flex flex-col items-start gap-4">
        {perfil.estado === "rechazado" && (
          <Aviso tono="alerta" titulo="Tu cuenta no está aprobada para publicar">
            <p>Si crees que es un error, comunícate con el administrador.</p>
          </Aviso>
        )}
        <BotonEnlace variante="secundario" href="/pescador">
          Ver mis capturas
        </BotonEnlace>
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

  if (error) return <ErrorCarga titulo="No pudimos cargar las especies" href="/pescador/publicar" />;

  // La hora inicial sale del servidor para que coincida al hidratar.
  return (
    <FormularioPublicar
      especies={especies ?? []}
      usuarioId={perfil.id}
      horaInicial={horaLocalSonora(new Date())}
    />
  );
}
