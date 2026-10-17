import { test } from "node:test";
import assert from "node:assert/strict";
import { esUuid } from "./rutas.ts";

test("esUuid: solo acepta UUID", () => {
  assert.equal(esUuid("3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b"), true);
  assert.equal(esUuid("00000000-0000-0000-0000-000000000000"), true); // formato válido: la RPC no la encuentra y sale la 404
  assert.equal(esUuid("abc"), false);
  assert.equal(esUuid(""), false);
});
