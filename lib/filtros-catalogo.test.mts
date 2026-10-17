import { test } from "node:test";
import assert from "node:assert/strict";
import { leerFiltros, urlCatalogo, hayFiltros } from "./filtros-catalogo.ts";

const vacio = { especie: null, precio: null, horas: null };

test("leerFiltros: los tres filtros de P03", () => {
  assert.deepEqual(leerFiltros({ especie: "1", precio: "100", horas: "12" }), { especie: 1, precio: 100, horas: 12 });
});

test("leerFiltros: ignora valores inválidos sin romper", () => {
  assert.deepEqual(leerFiltros({}), vacio);
  assert.deepEqual(leerFiltros({ especie: "abc", precio: "-5", horas: "7" }), vacio);
  assert.deepEqual(leerFiltros({ especie: "99999999999", precio: "120", horas: "" }), vacio);
  assert.deepEqual(leerFiltros({ especie: "0" }), vacio);
  assert.deepEqual(leerFiltros({ especie: ["2", "3"] }), { ...vacio, especie: 2 });
});

test("urlCatalogo y hayFiltros", () => {
  assert.equal(urlCatalogo({ especie: 1, precio: 100, horas: 12 }), "/?especie=1&precio=100&horas=12");
  assert.equal(urlCatalogo({ ...vacio, horas: 6 }), "/?horas=6");
  assert.equal(urlCatalogo(vacio), "/");
  assert.equal(hayFiltros(vacio), false);
  assert.equal(hayFiltros({ ...vacio, precio: 150 }), true);
});
