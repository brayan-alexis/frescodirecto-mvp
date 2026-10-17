import { test } from "node:test";
import assert from "node:assert/strict";
import { ERROR_CONEXION_PEDIDO, estimarPago, kgValido, ubicarErrorPedido } from "./pedir.ts";

test("estimarPago: pescado, comisión de 5 % y total", () => {
  assert.deepEqual(estimarPago(10, 95), { kg: 10, pescado: 950, comision: 47.5, total: 997.5 });
  assert.deepEqual(estimarPago(2, 85), { kg: 2, pescado: 170, comision: 8.5, total: 178.5 });
});

test("estimarPago: centavos con redondeo a la mitad hacia arriba", () => {
  assert.deepEqual(estimarPago(2.5, 155), { kg: 2.5, pescado: 387.5, comision: 19.38, total: 406.88 });
});

test("estimarPago: kg a 2 decimales, como la base", () => {
  assert.deepEqual(estimarPago(1.234, 100), { kg: 1.23, pescado: 123, comision: 6.15, total: 129.15 });
});

test("kgValido: mayor a 0 después de redondear a 2 decimales", () => {
  assert.equal(kgValido(null), false);
  assert.equal(kgValido(0), false);
  assert.equal(kgValido(-3), false);
  assert.equal(kgValido(0.004), false);
  assert.equal(kgValido(0.01), true);
  assert.equal(kgValido(2.5), true);
});

test("ubicarErrorPedido: kg, pago, captura no disponible, general o conexión", () => {
  const inventario = "Operación inválida: inventario insuficiente. Solo quedan 5 kg disponibles.";
  assert.deepEqual(
    ubicarErrorPedido({ mensaje: inventario, codigo: "INVENTARIO_INSUFICIENTE", campo: "kg" }),
    { destino: "kg", mensaje: inventario },
  );
  const rechazado =
    "Pago rechazado por la pasarela de prueba (tarjeta terminación 0002). No se hizo ningún cargo ni se apartó producto.";
  assert.deepEqual(
    ubicarErrorPedido({ mensaje: rechazado, codigo: "PAGO_RECHAZADO", campo: "pago" }),
    { destino: "pago", mensaje: rechazado },
  );
  assert.equal(
    ubicarErrorPedido({ mensaje: "Elige una tarjeta de prueba.", codigo: "DATO_INCOMPLETO", campo: "pago" })
      .destino,
    "pago",
  );
  assert.deepEqual(
    ubicarErrorPedido({
      mensaje: "Esta captura ya no está disponible.",
      codigo: "CAPTURA_NO_DISPONIBLE",
      campo: null,
    }),
    { destino: "no_disponible", mensaje: "Esta captura ya no está disponible." },
  );
  const rol = "Solo los restaurantes pueden hacer pedidos.";
  assert.deepEqual(ubicarErrorPedido({ mensaje: rol, codigo: "ROL_NO_PERMITIDO", campo: null }), {
    destino: "general",
    mensaje: rol,
  });
  assert.deepEqual(
    ubicarErrorPedido({ mensaje: "TypeError: Failed to fetch", codigo: null, campo: null }),
    { destino: "general", mensaje: ERROR_CONEXION_PEDIDO },
  );
});
