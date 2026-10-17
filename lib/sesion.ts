import { redirect } from "next/navigation";
import { cache } from "react";
import { inicioDeRol } from "@/lib/rutas";
import { createClient } from "@/lib/supabase/server";
import type { FilaPerfil, Rol } from "@/lib/tipos";

export type Perfil = Pick<FilaPerfil, "id" | "rol" | "estado" | "nombre" | "negocio">;

/**
 * Perfil de quien hace la petición, o null si no hay sesión.
 * Valida el token con getClaims(); nunca uses getSession() en el servidor.
 * `cache` evita repetir la consulta en una misma petición (encabezado, guarda y página).
 */
export const obtenerPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;

  // La política "Perfil propio o admin" deja leer la fila propia.
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, rol, estado, nombre, negocio")
    .eq("id", id)
    .maybeSingle<Perfil>();
  return perfil;
});

/**
 * Guarda de rol de las páginas protegidas: llámala antes de pintar cualquier contenido.
 * Sin sesión manda a /login; con otro rol, a la página inicial de su rol con ?aviso=rol.
 * La base de datos vuelve a validar todo; esto solo evita mostrar la sección equivocada.
 */
export async function exigirRol(permitidos: readonly Rol[]): Promise<Perfil> {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/login?aviso=acceso");
  if (!permitidos.includes(perfil.rol)) {
    redirect(`${inicioDeRol(perfil.rol)}?aviso=rol`);
  }
  return perfil;
}
