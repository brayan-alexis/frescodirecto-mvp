import { test } from "node:test";
import assert from "node:assert/strict";
import { separarPorCalificar } from "./calificaciones.ts";

const ahora = new Date("2026-10-17T15:00:00Z");
const fila = (id: string, puede_calificar: boolean, actualizado_en: string) => ({
  id,
  puede_calificar,
  actualizado_en,
});

test("separarPorCalificar: solo los calificables cerrados hace menos de 24 h", () => {
  const { recientes, ids } = separarPorCalificar(
    [
      fila("hoy", true, "2026-10-17T14:30:00Z"),
      fila("casi-24h", true, "2026-10-16T15:01:00Z"),
      fila("justo-24h", true, "2026-10-16T15:00:00Z"), // 24 h exactas: ya va al Historial
      fila("viejo", true, "2026-10-10T15:00:00Z"),
      fila("ya-calificado", false, "2026-10-17T14:00:00Z"),
    ],
    ahora,
  );
  assert.deepEqual(recientes.map((p) => p.id), ["hoy", "casi-24h"]);
  assert.equal(ids.has("hoy"), true);
  assert.equal(ids.has("viejo"), false);
});

test("separarPorCalificar: sin pedidos calificables no hay sección", () => {
  const { recientes, ids } = separarPorCalificar([fila("a", false, "2026-10-17T14:00:00Z")], ahora);
  assert.deepEqual(recientes, []);
  assert.equal(ids.size, 0);
});
