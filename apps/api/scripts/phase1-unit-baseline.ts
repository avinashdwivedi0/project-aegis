import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import nativeCrypto from "node:crypto";
import { promisify } from "node:util";
import ts from "typescript";

const sourcePath = "C:/aegis/repo-2662ae14442f7d86/backend/index.js";
const source = await readFile(sourcePath, "utf8");
const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const wanted = new Set(["hashPassword", "verifyPassword"]);
const declarations = new Map<string, string>();
for (const statement of sourceFile.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name) && wanted.has(declaration.name.text) && declaration.initializer) {
      declarations.set(declaration.name.text, statement.getFullText(sourceFile));
    }
  }
}
if (declarations.size !== wanted.size) throw new Error(`Found ${declarations.size}/${wanted.size} target declarations in ${sourcePath}`);

const fixedSalt = Buffer.from("000102030405060708090a0b0c0d0e0f", "hex");
const crypto = {
  randomBytes: (_size: number) => Buffer.from(fixedSalt),
  timingSafeEqual: nativeCrypto.timingSafeEqual,
};
const context = { crypto, scrypt: promisify(nativeCrypto.scrypt), Buffer };
vm.runInNewContext(`${declarations.get("hashPassword")}\n${declarations.get("verifyPassword")}\nglobalThis.targets = { hashPassword, verifyPassword };`, context, { filename: sourcePath });
const targets = (context as typeof context & { targets: { hashPassword(password: string): Promise<string>; verifyPassword(password: string, stored: string): Promise<boolean> } }).targets;
const password = "Aegis Phase1 baseline password!";
const hash = await targets.hashPassword(password);
const cases = [
  { name: "hash format and bytes", result: hash, saltBytes: Buffer.from(hash.split(":")[0], "hex").length, digestBytes: Buffer.from(hash.split(":")[1], "hex").length },
  { name: "verify correct password", result: await targets.verifyPassword(password, hash) },
  { name: "verify wrong password", result: await targets.verifyPassword("not the password", hash) },
  { name: "verify missing separator", result: await targets.verifyPassword(password, "malformed") },
  { name: "verify missing digest", result: await targets.verifyPassword(password, "00112233445566778899aabbccddeeff:") },
  { name: "verify missing salt", result: await targets.verifyPassword(password, ":00112233445566778899aabbccddeeff") },
];
const output = { sourcePath, extraction: "TypeScript AST source ranges for the real variable declarations; no target-repository refactor", password, fixedSaltHex: fixedSalt.toString("hex"), exactHash: hash, cases };
const outputPath = path.resolve("results/phase1-unit-baseline.json");
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
