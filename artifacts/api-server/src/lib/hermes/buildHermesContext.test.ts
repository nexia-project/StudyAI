import assert from "node:assert/strict";
import test, { after } from "node:test";
import { pool } from "@workspace/db";
import { shouldInjectProactiveActions } from "./buildHermesContext";

after(async () => {
  await pool.end();
});

test("proactive Hermes actions are only injected for internal audience", () => {
  assert.equal(shouldInjectProactiveActions("aluno"), false);
  assert.equal(shouldInjectProactiveActions("professor"), false);
  assert.equal(shouldInjectProactiveActions("interno"), true);
});
