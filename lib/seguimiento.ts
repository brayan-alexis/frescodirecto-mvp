// Ayudas de F4 (seguimiento). La base valida cada transición y mueve el dinero;
// aquí solo se decide qué botones mostrar, cómo ordenar las listas y qué sumar
// para el resumen del pescador con los montos que ya trae mis_pedidos.
import type { EstadoPedido, MiPedido } from "@/lib/tipos";

export const MAX_HISTORIAL = 20;

const ESTADOS_ACTIVOS: readonly EstadoPedido[] = ["solicitado", "aceptado", "entregado"];

/** Activos arriba (piden acción); historial con los cerrados, los 20 más recientes. */
export function separarPedidos(filas: MiPedido[]): { activos: MiPedido[]; historial: MiPedido[] } {
  return {
    activos: filas.filter((p) => ESTADOS_ACTIVOS.includes(p.estado)),
    historial: filas.filter((p) => !ESTADOS_ACTIVOS.includes(p.estado)).slice(0, MAX_HISTORIAL),
  };
}

export type AccionPedido = "cancelar" | "confirmar" | "responder" | "entregar";

/** El botón que tiene sentido según el papel, el estado y la modalidad (la base vuelve a validar). */
export function accionDe(p: Pick<MiPedido, "mi_papel" | "estado" | "modalidad">): AccionPedido | null {
  if (p.mi_papel === "restaurante") {
    if (p.estado === "solicitado") return "cancelar";
    if (p.estado === "entregado" || (p.estado === "aceptado" && p.modalidad === "recoleccion")) {
      return "confirmar";
    }
    return null;
  }
  if (p.estado === "solicitado") return "responder";
  if (p.estado === "aceptado") return "entregar";
  return null;
}

/** Recordatorio de los vencimientos de 24 h; los ejecuta la base cada hora. */
export function reglaDe24h(p: Pick<MiPedido, "mi_papel" | "estado">): string | null {
  const restaurante = p.mi_papel === "restaurante";
  if (p.estado === "solicitado") {
    return restaurante
      ? "Si el pescador no responde en 24 h, se cancela y se reembolsa."
      : "Si no respondes en 24 h, se cancela y se reembolsa al restaurante.";
  }
  if (p.estado === "entregado") {
    return restaurante
      ? "Si no reportas nada en 24 h, el pago se libera al pescador."
      : "Si el restaurante no reporta nada en 24 h, se libera tu pago.";
  }
  return null;
}

/**
 * Resumen de Mis ventas: solo suma para mostrar, en centavos enteros.
 * Por cobrar: valor del pescado con el pago retenido o en disputa. Cobrado: lo liberado.
 */
export function resumenVentas(filas: MiPedido[]): { porCobrar: number; cobrado: number } {
  let porCobrar = 0;
  let cobrado = 0;
  for (const p of filas) {
    if (p.pago_estado === "retenido" || p.pago_estado === "en_disputa") {
      porCobrar += Math.round(p.total * 100);
    } else if (p.pago_estado === "liberado") {
      cobrado += Math.round((p.monto_pescador ?? 0) * 100);
    }
  }
  return { porCobrar: porCobrar / 100, cobrado: cobrado / 100 };
}
