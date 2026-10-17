// Ayudas del formulario de publicar captura. La base valida todo; aquí solo
// se revisan campos vacíos y se preparan los valores para la RPC.
import type { ErrorRpc } from "@/lib/tipos";

export const CAMPOS_PUBLICAR = ["especie", "kg", "precio", "capturada_en", "foto", "notas"] as const;
export type CampoPublicar = (typeof CAMPOS_PUBLICAR)[number];

export const DATO_INCOMPLETO = "Dato incompleto";
export const ERROR_CONEXION = "No se pudo publicar. Revisa tu conexión e intenta de nuevo.";
export const ERROR_SUBIDA = "No se pudo subir la foto. Revisa tu conexión e intenta de nuevo.";
export const ERROR_FOTO = "No pudimos leer la foto. Toma otra o elige una en JPG.";

// Sonora está en UTC−7 todo el año (no cambia de horario).
const DESFASE_SONORA_MS = 7 * 60 * 60 * 1000;

/** "12,5", "12.5" o "$155" a número; vacío o ilegible da null (la base responde junto al campo). */
export function leerDecimal(texto: string): number | null {
  const limpio = texto.replace(/[\s$]/g, "").replace(",", ".");
  if (!limpio) return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : null;
}

/** Valor de <input type="datetime-local"> en hora de Sonora: "AAAA-MM-DDTHH:mm". */
export function horaLocalSonora(fecha: Date): string {
  return new Date(fecha.getTime() - DESFASE_SONORA_MS).toISOString().slice(0, 16);
}

/** De "AAAA-MM-DDTHH:mm[:ss]" en hora de Sonora a ISO en UTC, o null si no es válida. */
export function horaSonoraAIso(valor: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(valor)) return null;
  const fecha = new Date(`${valor.length === 16 ? `${valor}:00` : valor}-07:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

/** Campos obligatorios vacíos, en el orden del formulario. */
export function camposVacios(v: {
  especie: string;
  kg: string;
  precio: string;
  capturada_en: string;
  foto: boolean;
}): CampoPublicar[] {
  const vacios: CampoPublicar[] = [];
  if (!v.especie.trim()) vacios.push("especie");
  if (!v.kg.trim()) vacios.push("kg");
  if (!v.precio.trim()) vacios.push("precio");
  if (!v.capturada_en.trim()) vacios.push("capturada_en");
  if (!v.foto) vacios.push("foto");
  return vacios;
}

/**
 * Dónde mostrar un error de publicar_captura: junto a su campo o arriba del formulario.
 * Sin código es un error de red o inesperado (puede venir en inglés): se muestra uno genérico.
 */
export function ubicarError(e: ErrorRpc): { destino: CampoPublicar | "general"; mensaje: string } {
  const campo = CAMPOS_PUBLICAR.find((c) => c === e.campo);
  if (campo) return { destino: campo, mensaje: e.mensaje };
  if (e.codigo == null) return { destino: "general", mensaje: ERROR_CONEXION };
  return { destino: "general", mensaje: e.mensaje };
}
