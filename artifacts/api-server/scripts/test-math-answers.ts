import assert from "node:assert/strict";
import { answersMatch } from "../src/routes/math";

assert.equal(answersMatch("10", "1"), false, "numeric substrings must not match");
assert.equal(answersMatch("2", "12"), false, "reverse numeric substrings must not match");
assert.equal(answersMatch("x = 2", "2"), true, "equation RHS should match a bare answer");
assert.equal(answersMatch("2", "x = 2"), true, "bare expected answer should match equation RHS");
assert.equal(answersMatch("3.14", "3.1400001"), true, "numeric tolerance should be preserved");
assert.equal(answersMatch("x = 10", "1"), false, "equation RHS substrings must not match");
assert.equal(answersMatch("x = 2, y = 3", "3"), false, "partial multi-equation answers must not match");

console.log("math answer comparison tests passed");
