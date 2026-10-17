import type { SupabaseClient } from "@supabase/supabase-js";

/** URL pública de una foto del bucket `capturas`, o null si la captura no trae ruta. */
export function urlFoto(
  supabase: Pick<SupabaseClient, "storage">,
  fotoPath: string | null,
): string | null {
  if (!fotoPath?.trim()) return null;
  return supabase.storage.from("capturas").getPublicUrl(fotoPath).data.publicUrl;
}
