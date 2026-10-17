import { test } from "node:test";
import assert from "node:assert/strict";
import { medidasFoto } from "./comprimir-foto.ts";

test("medidasFoto: lado mayor de 1280 px sin agrandar", () => {
  assert.deepEqual(medidasFoto(4032, 3024), { ancho: 1280, alto: 960 });
  assert.deepEqual(medidasFoto(3024, 4032), { ancho: 960, alto: 1280 });
  assert.deepEqual(medidasFoto(800, 600), { ancho: 800, alto: 600 });
  assert.deepEqual(medidasFoto(4000, 2251), { ancho: 1280, alto: 720 });
});
