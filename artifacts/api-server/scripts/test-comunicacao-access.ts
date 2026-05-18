import assert from "node:assert/strict";
import {
  hasInstitutionCommunicationRole,
  isInstitutionCommunicationPath,
} from "../src/lib/comunicacaoAccess";

assert.equal(isInstitutionCommunicationPath("/api/comunicacao/institution/status"), true);
assert.equal(isInstitutionCommunicationPath("/api/comunicacao/institution/preview?dryRun=1"), true);
assert.equal(isInstitutionCommunicationPath("/api/comunicacao/regras"), false);
assert.equal(isInstitutionCommunicationPath("/api/comunicacao/check-triggers"), false);
assert.equal(isInstitutionCommunicationPath("/api/comunicacao/institutional/status"), false);

assert.equal(hasInstitutionCommunicationRole("teacher", null, null), true);
assert.equal(hasInstitutionCommunicationRole("institution_admin", null, null), true);
assert.equal(hasInstitutionCommunicationRole("student", "teacher", true), true);
assert.equal(hasInstitutionCommunicationRole("student", "teacher", false), false);
assert.equal(hasInstitutionCommunicationRole("student", "student", true), false);

console.log("comunicacao access checks passed");
