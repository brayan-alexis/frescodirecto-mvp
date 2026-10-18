import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fechaLarga,
  formatoDinero,
  formatoEstrellas,
  formatoKg,
  haceCuanto,
  horaExacta,
  horasDesde,
  horasRestantes,
  horaSonora,
  formatoReputacion,
} from "./formato.ts";

test("formatoDinero: siempre con centavos", () => {
  assert.equal(formatoDinero(95), "$95.00");
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

test("horasDesde: minutos u horas desde la fecha", () => {
  assert.equal(horasDesde("2026-10-17T14:20:00Z", ahora), "hace 40 min");
  assert.equal(horasDesde("2026-10-17T11:30:00Z", ahora), "hace 3 h");
});

test("horasRestantes: horas enteras del catálogo de 24 h, nunca negativas", () => {
  assert.equal(horasRestantes("2026-10-17T12:00:00Z", ahora), 21);
  assert.equal(horasRestantes("2026-10-17T11:30:00Z", ahora), 20); // 20.5 h → 20
  assert.equal(horasRestantes("2026-10-17T15:00:00Z", ahora), 24);
  assert.equal(horasRestantes("2026-10-16T10:00:00Z", ahora), 0);
});

test("horaExacta: 24 h y fecha corta en hora de Sonora", () => {
  assert.match(horaExacta("2026-10-17T13:52:00Z"), /^06:52 · 17 oct\.?$/);
  assert.match(horaExacta("2026-10-17T05:20:00Z"), /^22:20 · 16 oct\.?$/);
});

test("formatoReputacion: promedio con 3 o más calificaciones; si no, Nuevo", () => {
  assert.equal(formatoReputacion(4.3, 11, "corta"), "★ 4.3 (11)");
  assert.equal(formatoReputacion(4.3, 11, "larga"), "★ 4.3 · 11 calificaciones");
  assert.equal(formatoReputacion(4, 10, "corta"), "★ 4.0 (10)");
  assert.equal(formatoReputacion(null, 2, "larga"), "Nuevo");
});

test("formatoEstrellas: llenas y vacías hasta 5", () => {
  assert.equal(formatoEstrellas(5), "★★★★★");
  assert.equal(formatoEstrellas(4), "★★★★☆");
  assert.equal(formatoEstrellas(1), "★☆☆☆☆");
});

test("fechaLarga: día de la semana con mayúscula, en hora de Sonora", () => {
  assert.equal(fechaLarga(new Date("2026-10-17T15:00:00Z")), "Sábado 17 de octubre");
  // 05:20 UTC del 18 todavía es el sábado 17 en Sonora (UTC−7).
  assert.equal(fechaLarga(new Date("2026-10-18T05:20:00Z")), "Sábado 17 de octubre");
  assert.equal(fechaLarga(new Date("2026-10-18T07:30:00Z")), "Domingo 18 de octubre");
});
