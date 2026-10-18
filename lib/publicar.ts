// Ayudas del formulario de publicar captura. La base valida todo; aquí solo
// se revisan campos vacíos y se preparan los valores para la RPC.
import type { ErrorRpc } from "@/lib/tipos";

export const CAMPOS_PUBLICAR = ["especie", "kg", "precio", "capturada_en", "foto", "notas"] as const;
export type CampoPublicar = (typeof CAMPOS_PUBLICAR)[number];

export const DATO_INCOMPLETO = "Dato incompleto";

/**
 * "Dato incompleto." + cómo corregirlo (docs/ui/IMPLEMENTAR_UI.md, Fase 3). Se usan para
 * un campo vacío antes de enviar y para el hint de la base cuando responde DATO_INCOMPLETO.
 */
export const MENSAJES_INCOMPLETO = {
  especie: "Dato incompleto. Elige una especie.",
  kg: "Dato incompleto. Los kilos deben ser mayores a 0.",
  precio: "Dato incompleto. El precio debe ser mayor a $0.",
  capturada_en: "Dato incompleto. Indica la hora de captura.",
  foto: "Dato incompleto. Agrega una foto de la captura.",
} as const satisfies Partial<Record<CampoPublicar, string>>;

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
 * Dónde mostrar un error de publicar_captura: junto a su campo (el hint) o arriba del formulario.
 * Con DATO_INCOMPLETO el texto es el de MENSAJES_INCOMPLETO; los demás códigos traen la cifra
 * real en el mensaje de la base ("máximo 2,000 kg"), así que se muestra tal cual.
 * `precioEnviado`: la base también responde DATO_INCOMPLETO con un precio mayor a $5,000;
 * si el precio era positivo, "debe ser mayor a $0" no aplica y va el mensaje de la base.
 * Sin código es un error de red o inesperado (puede venir en inglés): se muestra uno genérico.
 */
export function ubicarError(
  e: ErrorRpc,
  precioEnviado: number | null = null,
): { destino: CampoPublicar | "general"; mensaje: string } {
  const campo = CAMPOS_PUBLICAR.find((c) => c === e.campo);
  if (campo) {
    const traducido =
      e.codigo === "DATO_INCOMPLETO" && campo in MENSAJES_INCOMPLETO
        ? MENSAJES_INCOMPLETO[campo as keyof typeof MENSAJES_INCOMPLETO]
        : null;
    const precioPositivo = campo === "precio" && precioEnviado != null && precioEnviado > 0;
    return { destino: campo, mensaje: traducido && !precioPositivo ? traducido : e.mensaje };
  }
  if (e.codigo == null) return { destino: "general", mensaje: ERROR_CONEXION };
  return { destino: "general", mensaje: e.mensaje };
}
