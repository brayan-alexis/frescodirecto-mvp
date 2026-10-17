// Ayudas del formulario de pedido. La base descuenta el inventario y calcula el
// dinero; aquí solo se valida kg y se arma el total estimado del paso de pago,
// que es informativo: los montos reales salen de mis_pedidos.
import type { ErrorRpc, Modalidad } from "@/lib/tipos";

export const MODALIDADES: readonly { valor: Modalidad; texto: string }[] = [
  { valor: "entrega", texto: "Entrega en mi negocio" },
  { valor: "recoleccion", texto: "Recolección en el muelle" },
];

export type TarjetaPrueba = "4242" | "0002";

// Solo viaja la terminación: nunca se piden ni se envían números de tarjeta.
export const TARJETAS_PRUEBA: readonly { valor: TarjetaPrueba; texto: string }[] = [
  { valor: "4242", texto: "Visa de prueba terminación 4242 (se aprueba)" },
  { valor: "0002", texto: "Visa de prueba terminación 0002 (se rechaza)" },
];

export const KG_INVALIDO = "La cantidad debe ser mayor a 0 kg.";
export const ERROR_CONEXION_PEDIDO =
  "No se pudo completar el pedido. Revisa tu conexión e intenta de nuevo.";

// Igual que public.tasa_comision(): 5 % que paga el restaurante encima del pescado.
const COMISION_PORCENTAJE = 5;

/** ¿Hay kg que pedir? La base redondea a 2 decimales, así que 0.004 kg es 0. */
export function kgValido(kg: number | null): kg is number {
  return kg != null && Math.round(kg * 100) > 0;
}

/** Total estimado del paso de pago. Se calcula en centavos enteros para no arrastrar decimales. */
export function estimarPago(
  kg: number,
  precioKg: number,
): { kg: number; pescado: number; comision: number; total: number } {
  const kgRedondeado = Math.round(kg * 100) / 100;
  const pescadoCent = Math.round(kgRedondeado * precioKg * 100);
  const comisionCent = Math.round((pescadoCent * COMISION_PORCENTAJE) / 100);
  return {
    kg: kgRedondeado,
    pescado: pescadoCent / 100,
    comision: comisionCent / 100,
    total: (pescadoCent + comisionCent) / 100,
  };
}

export type DestinoErrorPedido = "kg" | "pago" | "no_disponible" | "general";

/**
 * Dónde mostrar un error de solicitar_pedido: bajo kg (paso 1), junto a la tarjeta
 * (paso 2), en lugar del formulario si la captura ya no está, o arriba del formulario.
 * Sin código es un error de red o inesperado (puede venir en inglés): se muestra uno genérico.
 */
export function ubicarErrorPedido(e: ErrorRpc): { destino: DestinoErrorPedido; mensaje: string } {
  if (e.campo === "kg") return { destino: "kg", mensaje: e.mensaje };
  if (e.codigo === "PAGO_RECHAZADO" || e.campo === "pago") return { destino: "pago", mensaje: e.mensaje };
  if (e.codigo === "CAPTURA_NO_DISPONIBLE") return { destino: "no_disponible", mensaje: e.mensaje };
  if (e.codigo == null) return { destino: "general", mensaje: ERROR_CONEXION_PEDIDO };
  return { destino: "general", mensaje: e.mensaje };
}
