// Estado de una captura para la lista del pescador. Es solo para mostrar:
// el catálogo y los pedidos los decide la base (regla de 24 h e inventario).
import type { FilaCaptura } from "@/lib/tipos";

export type EstadoVista = "activa" | "agotada" | "vencida" | "retirada";

/** Horas transcurridas desde `fechaIso` hasta `ahora`. */
export function horasDesde(fechaIso: string, ahora: Date): number {
  return (ahora.getTime() - new Date(fechaIso).getTime()) / 3_600_000;
}

/**
 * Retirada > Agotada > Vencida > Activa. Las 24 h se cuentan desde `capturada_en`,
 * igual que catalogo_del_dia.
 */
export function estadoCaptura(
  c: Pick<FilaCaptura, "estado" | "kg_disponibles" | "capturada_en">,
  ahora: Date,
): EstadoVista {
  if (c.estado === "retirada") return "retirada";
  if (c.kg_disponibles <= 0) return "agotada";
  if (horasDesde(c.capturada_en, ahora) >= 24) return "vencida";
  return "activa";
}
