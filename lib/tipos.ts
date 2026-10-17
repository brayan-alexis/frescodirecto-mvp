// Tipos escritos a mano a partir de supabase/migrations/20261015120000_esquema_mvp.sql.
// PostgREST entrega numeric, integer y bigint como número, y timestamptz como texto ISO en UTC.

export type Rol = "restaurante" | "pescador" | "admin";
export type EstadoCuenta = "pendiente" | "aprobado" | "rechazado";
export type EstadoCaptura = "activa" | "retirada";
export type EstadoPedido =
  | "solicitado"
  | "aceptado"
  | "rechazado"
  | "entregado"
  | "recibido_conforme"
  | "con_incidencia"
  | "cancelado";
export type EstadoPago = "retenido" | "en_disputa" | "liberado" | "reembolsado";
export type Modalidad = "entrega" | "recoleccion";

// Filas de las tablas (la app solo las lee; las escrituras van por RPC).

export interface FilaEspecie {
  id: number;
  nombre: string;
  activa: boolean;
}

export interface FilaPerfil {
  id: string;
  rol: Rol;
  estado: EstadoCuenta;
  nombre: string;
  negocio: string | null;
  telefono: string | null;
  email: string | null;
  creado_en: string;
}

export interface FilaCaptura {
  id: string;
  pescador_id: string;
  especie_id: number;
  kg_publicados: number;
  kg_disponibles: number;
  precio_kg: number;
  capturada_en: string;
  publicada_en: string;
  foto_path: string;
  notas: string | null;
  estado: EstadoCaptura;
}

export interface FilaPedido {
  id: string;
  numero: number;
  folio: string;
  captura_id: string;
  restaurante_id: string;
  pescador_id: string;
  kg: number;
  precio_kg: number;
  total: number;
  modalidad: Modalidad;
  estado: EstadoPedido;
  motivo_rechazo: string | null;
  nota_incidencia: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface FilaPedidoEvento {
  id: number;
  pedido_id: string;
  estado: EstadoPedido;
  actor_id: string | null; // vacío: lo hizo el sistema (vencimientos automáticos)
  nota: string | null;
  creado_en: string;
}

export interface FilaPago {
  id: string;
  numero: number;
  recibo: string;
  pedido_id: string;
  restaurante_id: string;
  pescador_id: string;
  subtotal: number;
  comision: number;
  total: number;
  estado: EstadoPago;
  proveedor: "simulado" | "stripe" | "mercadopago";
  metodo: string;
  referencia_proveedor: string | null;
  pagado_en: string;
  liberado_en: string | null;
  reembolsado_en: string | null;
  monto_pescador: number;
  monto_reembolsado: number;
  comision_cobrada: number;
  nota_resolucion: string | null;
  resuelto_por: string | null;
}

export interface FilaCalificacion {
  id: string;
  pedido_id: string;
  restaurante_id: string;
  pescador_id: string;
  estrellas: number;
  comentario: string | null;
  creado_en: string;
}

// Resultados de las funciones de lectura.

/** Fila de rpc('catalogo_del_dia'). `calificacion` viene vacía con menos de 3 calificaciones. */
export interface CapturaCatalogo {
  id: string;
  especie_id: number;
  especie: string;
  pescador: string;
  cooperativa: string | null;
  kg_disponibles: number;
  kg_publicados: number;
  precio_kg: number;
  capturada_en: string;
  publicada_en: string;
  horas_desde_captura: number;
  foto_path: string;
  notas: string | null;
  calificacion: number | null;
  num_calificaciones: number;
}

/** Fila de rpc('detalle_captura'). */
export interface DetalleCaptura extends CapturaCatalogo {
  disponible: boolean;
}

/** Fila de rpc('mis_pedidos'). El pago y la calificación llegan por left join. */
export interface MiPedido {
  id: string;
  folio: string;
  mi_papel: "restaurante" | "pescador";
  estado: EstadoPedido;
  especie: string;
  foto_path: string;
  kg: number;
  precio_kg: number;
  total: number;
  modalidad: Modalidad;
  contraparte: string;
  contraparte_negocio: string | null;
  contraparte_telefono: string | null; // solo con el pedido aceptado o entregado
  motivo_rechazo: string | null;
  nota_incidencia: string | null;
  creado_en: string;
  actualizado_en: string;
  pago_estado: EstadoPago | null;
  recibo: string | null;
  comision: number | null;
  total_pagado: number | null;
  monto_pescador: number | null;
  monto_reembolsado: number | null;
  calificacion: number | null;
  puede_calificar: boolean;
}

/** Fila de rpc('mis_calificaciones'). Los comentarios solo los ve el pescador dueño. */
export interface MiCalificacion {
  folio: string;
  especie: string;
  estrellas: number;
  comentario: string | null;
  restaurante: string;
  creado_en: string;
}

// Errores de las funciones: message es el texto para el usuario, details el código y hint el campo.

export const CODIGOS_ERROR = [
  "DATO_INCOMPLETO",
  "DATO_INVALIDO",
  "INVENTARIO_INSUFICIENTE",
  "CAPTURA_NO_DISPONIBLE",
  "PAGO_RECHAZADO",
  "ROL_NO_PERMITIDO",
  "TRANSICION_INVALIDA",
  "NO_CALIFICABLE",
  "YA_CALIFICADO",
  "SIN_SESION",
  "PEDIDO_NO_ENCONTRADO",
  "PAGO_NO_ENCONTRADO",
  "PERFIL_NO_ENCONTRADO",
  "SIN_CUENTAS_DEMO",
] as const;
export type CodigoError = (typeof CODIGOS_ERROR)[number];

export const CAMPOS_ERROR = [
  "especie",
  "kg",
  "precio",
  "foto",
  "capturada_en",
  "notas",
  "pago",
  "nota",
  "estrellas",
  "comentario",
  "reembolso",
] as const;
export type CampoError = (typeof CAMPOS_ERROR)[number];

export interface ErrorRpc {
  mensaje: string;
  codigo: CodigoError | null;
  campo: CampoError | null;
}

function estaEn<T extends string>(
  lista: readonly T[],
  valor: string | null | undefined,
): valor is T {
  return valor != null && (lista as readonly string[]).includes(valor);
}

/** Lee el error de una RPC. Muestra `mensaje` junto al `campo`; sin campo, arriba del formulario. */
export function leerErrorRpc(error: {
  message: string;
  details?: string | null;
  hint?: string | null;
}): ErrorRpc {
  return {
    mensaje: error.message,
    codigo: estaEn(CODIGOS_ERROR, error.details) ? error.details : null,
    campo: estaEn(CAMPOS_ERROR, error.hint) ? error.hint : null,
  };
}
