import { test } from "node:test";
import assert from "node:assert/strict";
import { estadoCaptura, horasDesde } from "./capturas.ts";

const ahora = new Date("2026-10-17T15:00:00Z");
const captura = (estado: "activa" | "retirada", kg: number, capturadaEn: string) => ({
  estado,
  kg_disponibles: kg,
  capturada_en: capturadaEn,
});

test("horasDesde: horas entre la fecha y ahora", () => {
  assert.equal(horasDesde("2026-10-17T12:00:00Z", ahora), 3);
});

test("estadoCaptura: activa con kg y menos de 24 h", () => {
  assert.equal(estadoCaptura(captura("activa", 8, "2026-10-17T06:00:00Z"), ahora), "activa");
});

test("estadoCaptura: agotada con 0 kg, aunque tenga más de 24 h", () => {
  assert.equal(estadoCaptura(captura("activa", 0, "2026-10-17T13:00:00Z"), ahora), "agotada");
  assert.equal(estadoCaptura(captura("activa", 0, "2026-10-16T09:00:00Z"), ahora), "agotada");
});

test("estadoCaptura: vencida desde las 24 h", () => {
  assert.equal(estadoCaptura(captura("activa", 8, "2026-10-16T09:00:00Z"), ahora), "vencida");
  assert.equal(estadoCaptura(captura("activa", 8, "2026-10-16T15:00:00Z"), ahora), "vencida");
});

test("estadoCaptura: retirada gana a todo", () => {
  assert.equal(estadoCaptura(captura("retirada", 8, "2026-10-17T13:00:00Z"), ahora), "retirada");
  assert.equal(estadoCaptura(captura("retirada", 0, "2026-10-17T13:00:00Z"), ahora), "retirada");
});
