import type { CharacterizationBaseline, JavaScriptUnitTarget } from "./unit.types.js";

const requiredTargets = ["hashPassword", "verifyPassword"] as const;

export class PasswordCharacterizationGenerator {
  generate(targets: JavaScriptUnitTarget[], baseline: CharacterizationBaseline): string {
    const targetMap = new Map(targets.map((target) => [target.name, target]));
    for (const name of requiredTargets) {
      if (!targetMap.has(name)) throw new Error(`Required target ${name} was not discovered.`);
    }
    const hashPassword = targetMap.get("hashPassword")!;
    const verifyPassword = targetMap.get("verifyPassword")!;
    if (hashPassword.unsupportedReasons.length || verifyPassword.unsupportedReasons.length) {
      throw new Error("Password targets have unsupported side effects; human review is required.");
    }
    const known = new Map(baseline.cases.map((item) => [item.name, item.result]));
    const baselineCorrect = known.get("verify correct password");
    const baselineWrong = known.get("verify wrong password");
    const baselineMissingSeparator = known.get("verify missing separator");
    const baselineMissingDigest = known.get("verify missing digest");
    const baselineMissingSalt = known.get("verify missing salt");
    if (
      baselineCorrect !== true || baselineWrong !== false ||
      baselineMissingSeparator !== false || baselineMissingDigest !== false || baselineMissingSalt !== false
    ) throw new Error("The captured baseline does not match the supported password characterization recipe.");

    return `// Generated from the real declarations at ${hashPassword.filePath}:${hashPassword.lineStart}-${hashPassword.lineEnd} and ${verifyPassword.filePath}:${verifyPassword.lineStart}-${verifyPassword.lineEnd}.
// The target repository is not refactored: these exact AST source declarations run in this isolated test module.
const test = require("node:test");
const assert = require("node:assert/strict");
const nodeCrypto = require("node:crypto");
const { promisify } = require("node:util");
const fixedSalt = Buffer.from(${JSON.stringify(baseline.fixedSaltHex)}, "hex");
const crypto = {
  randomBytes: () => Buffer.from(fixedSalt),
  timingSafeEqual: nodeCrypto.timingSafeEqual,
};
const scrypt = promisify(nodeCrypto.scrypt);

${hashPassword.implementation}

${verifyPassword.implementation}

const password = ${JSON.stringify(baseline.password)};
const expectedHash = ${JSON.stringify(baseline.exactHash)};

test("@critical hashPassword preserves the captured byte-for-byte hash", async () => {
  assert.equal(await hashPassword(password), expectedHash);
});

test("@critical hashPassword emits a 16-byte salt and 64-byte scrypt digest", async () => {
  const [salt, digest] = (await hashPassword(password)).split(":");
  assert.equal(Buffer.from(salt, "hex").length, 16);
  assert.equal(Buffer.from(digest, "hex").length, 64);
});

test("@critical verifyPassword accepts the baseline correct password", async () => {
  assert.equal(await verifyPassword(password, expectedHash), true);
});

test("@critical verifyPassword rejects a wrong password", async () => {
  assert.equal(await verifyPassword("not the password", expectedHash), false);
});

test("@critical verifyPassword rejects malformed stored hashes", async () => {
  assert.equal(await verifyPassword(password, "malformed"), false);
  assert.equal(await verifyPassword(password, "00112233445566778899aabbccddeeff:"), false);
  assert.equal(await verifyPassword(password, ":00112233445566778899aabbccddeeff"), false);
});
`;
  }
}

export const passwordCharacterizationGenerator = new PasswordCharacterizationGenerator();
