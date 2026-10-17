// Ayudas de F5 (calificación). La base decide quién puede calificar (`puede_calificar`
// de mis_pedidos) y guarda la calificación; aquí solo se decide dónde mostrar la tarjeta.
import type { MiPedido } from "@/lib/tipos";

export const HORAS_POR_CALIFICAR = 24;

/**
 * "Por calificar": pedidos que se pueden calificar y se cerraron hace menos de 24 h.
 * Van arriba de la lista; los más viejos muestran la tarjeta en su fila del Historial.
 * `ids` sirve para no repetir la tarjeta en la fila de un pedido reciente.
 */
export function separarPorCalificar<T extends Pick<MiPedido, "id" | "puede_calificar" | "actualizado_en">>(
  filas: T[],
  ahora: Date,
): { recientes: T[]; ids: Set<string> } {
  const limite = ahora.getTime() - HORAS_POR_CALIFICAR * 60 * 60 * 1000;
  const recientes = filas.filter((p) => p.puede_calificar && new Date(p.actualizado_en).getTime() > limite);
  return { recientes, ids: new Set(recientes.map((p) => p.id)) };
}
