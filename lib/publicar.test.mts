import { test } from "node:test";
import assert from "node:assert/strict";
import {
  camposVacios,
  ERROR_CONEXION,
  horaLocalSonora,
  horaSonoraAIso,
  leerDecimal,
  ubicarError,
} from "./publicar.ts";

test("leerDecimal: punto, coma y signo de pesos", () => {
  assert.equal(leerDecimal("12.5"), 12.5);
  assert.equal(leerDecimal("12,5"), 12.5);
  assert.equal(leerDecimal(" $155 "), 155);
  assert.equal(leerDecimal("0"), 0);
  assert.equal(leerDecimal(""), null);
  assert.equal(leerDecimal("abc"), null);
});

test("horaLocalSonora: valor de datetime-local en UTC−7", () => {
  assert.equal(horaLocalSonora(new Date("2026-10-17T15:00:00Z")), "2026-10-17T08:00");
  assert.equal(horaLocalSonora(new Date("2026-10-17T05:20:00Z")), "2026-10-16T22:20");
});

test("horaSonoraAIso: de hora de Sonora a ISO en UTC", () => {
  assert.equal(horaSonoraAIso("2026-10-17T08:00"), "2026-10-17T15:00:00.000Z");
  assert.equal(horaSonoraAIso("2026-10-16T22:20"), "2026-10-17T05:20:00.000Z");
  assert.equal(horaSonoraAIso("2026-10-17T08:00:30"), "2026-10-17T15:00:30.000Z");
  assert.equal(horaSonoraAIso(""), null);
  assert.equal(horaSonoraAIso("hola"), null);
});

const lleno = { especie: "3", kg: "12.5", precio: "155", capturada_en: "2026-10-17T08:00", foto: true };

test("camposVacios: en el orden del formulario", () => {
  assert.deepEqual(camposVacios(lleno), []);
  assert.deepEqual(camposVacios({ ...lleno, foto: false }), ["foto"]);
  assert.deepEqual(camposVacios({ ...lleno, kg: "  " }), ["kg"]);
  assert.deepEqual(
    camposVacios({ especie: "", kg: "", precio: "", capturada_en: "", foto: false }),
    ["especie", "kg", "precio", "capturada_en", "foto"],
  );
});

test("ubicarError: campo del formulario, general o conexión", () => {
  const kg = "Dato incompleto: los kilogramos deben ser mayores a 0.";
  assert.deepEqual(ubicarError({ mensaje: kg, codigo: "DATO_INCOMPLETO", campo: "kg" }), {
    destino: "kg",
    mensaje: kg,
  });
  assert.equal(ubicarError({ mensaje: "x", codigo: "DATO_INVALIDO", campo: "notas" }).destino, "notas");
  const rol = "Solo los pescadores con cuenta aprobada pueden publicar.";
  assert.deepEqual(ubicarError({ mensaje: rol, codigo: "ROL_NO_PERMITIDO", campo: null }), {
    destino: "general",
    mensaje: rol,
  });
  assert.deepEqual(ubicarError({ mensaje: "TypeError: Failed to fetch", codigo: null, campo: null }), {
    destino: "general",
    mensaje: ERROR_CONEXION,
  });
  assert.deepEqual(ubicarError({ mensaje: "x", codigo: "DATO_INVALIDO", campo: "pago" }), {
    destino: "general",
    mensaje: "x",
  });
});
