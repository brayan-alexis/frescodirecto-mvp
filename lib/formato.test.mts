import { test } from "node:test";
import assert from "node:assert/strict";
import { formatoDinero, formatoKg, haceCuanto, horaSonora, formatoReputacion } from "./formato.ts";

test("formatoDinero: sin decimales si el monto es entero", () => {
  assert.equal(formatoDinero(95), "$95");
  assert.equal(formatoDinero(1250.5), "$1,250.50");
  assert.equal(formatoDinero(997.5), "$997.50");
});

test("formatoKg: hasta 2 decimales", () => {
  assert.equal(formatoKg(12.5), "12.5 kg");
  assert.equal(formatoKg(30), "30 kg");
  assert.equal(formatoKg(1250), "1,250 kg");
});

test("haceCuanto: minutos bajo 1 h y horas completas desde 1 h", () => {
  assert.equal(haceCuanto(0.75), "hace 45 min");
  assert.equal(haceCuanto(0), "hace 1 min");
  assert.equal(haceCuanto(1), "hace 1 h");
  assert.equal(haceCuanto(2.7), "hace 2 h");
  assert.equal(haceCuanto(30), "hace 30 h");
  assert.equal(haceCuanto(0.995), "hace 1 h"); // nunca "hace 60 min"
});

// \s acepta el espacio normal o el fino; algunas versiones de ICU escriben "a. m."
const ahora = new Date("2026-10-17T15:00:00Z"); // 8:00 a. m. del 17 en Sonora
test("horaSonora: hoy, ayer y días anteriores en hora de Sonora", () => {
  assert.match(horaSonora("2026-10-17T12:40:00Z", ahora), /^hoy 5:40\sa\.\s?m\.$/);
  assert.match(horaSonora("2026-10-17T05:20:00Z", ahora), /^ayer 10:20\sp\.\s?m\.$/); // 17 en UTC, 16 en Sonora
  assert.match(horaSonora("2026-10-14T13:00:00Z", ahora), /^14 oct\.? 6:00\sa\.\s?m\.$/);
});

test("formatoReputacion: promedio con 3 o más calificaciones; si no, Nuevo", () => {
  assert.equal(formatoReputacion(4.3, 11, "corta"), "★ 4.3 (11)");
  assert.equal(formatoReputacion(4.3, 11, "larga"), "★ 4.3 · 11 calificaciones");
  assert.equal(formatoReputacion(4, 10, "corta"), "★ 4.0 (10)");
  assert.equal(formatoReputacion(null, 2, "larga"), "Nuevo");
});
