// Ayudas de la resolución de disputas. La base mueve el dinero en resolver_disputa;
// aquí solo se arma el monto que se envía y la confirmación previa, que es
// informativa: los montos reales vuelven en la respuesta de la función.
import { leerDecimal } from "@/lib/publicar";

export type OpcionResolucion = "todo" | "pescador" | "parcial";

export const OPCIONES_RESOLUCION: readonly { valor: OpcionResolucion; texto: string }[] = [
  { valor: "todo", texto: "Reembolsar todo al restaurante" },
  { valor: "pescador", texto: "Pagar al pescador" },
  { valor: "parcial", texto: "Reembolso parcial" },
];

/**
 * Cuánto del valor del pescado se devuelve al restaurante, o null si el monto
 * parcial no se entiende o queda fuera de $0 a `subtotal`.
 */
export function montoReembolso(opcion: OpcionResolucion, subtotal: number, texto: string): number | null {
  if (opcion === "todo") return subtotal;
  if (opcion === "pescador") return 0;
  const monto = leerDecimal(texto);
  if (monto == null) return null;
  const centavos = Math.round(monto * 100);
  if (centavos < 0 || centavos > Math.round(subtotal * 100)) return null;
  return centavos / 100;
}

/**
 * Reparto que hará resolver_disputa, en centavos enteros: el restaurante recupera
 * el reembolso más la comisión (con incidencia no se cobra) y el pescador, el resto.
 */
export function repartoDisputa(
  subtotal: number,
  comision: number,
  reembolso: number,
): { alRestaurante: number; alPescador: number } {
  const reembolsoCent = Math.round(reembolso * 100);
  return {
    alRestaurante: (reembolsoCent + Math.round(comision * 100)) / 100,
    alPescador: (Math.round(subtotal * 100) - reembolsoCent) / 100,
  };
}
