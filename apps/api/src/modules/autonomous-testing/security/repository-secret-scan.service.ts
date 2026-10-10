import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";

export type SecretFinding = { ruleId: string; severity: "high"; filePath: string; line: number; message: string };

const SOURCE_GLOBS = [
  "**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,py,go,java,cs,rb,php,env,json,yml,yaml,toml,properties,sh,bash}",
];
const IGNORE = ["**/.git/**", "**/node_modules/**", "**/vendor/**", "**/dist/**", "**/build/**", "**/coverage/**", "**/.venv/**", "**/target/**"];
const SECRET_RULES: Array<{ ruleId: string; regex: RegExp; message: string }> = [
  { ruleId: "hardcoded-private-key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, message: "A private-key block is embedded in source." },
  { ruleId: "aws-access-key", regex: /\bAKIA[0-9A-Z]{16}\b/, message: "An AWS access-key identifier is embedded in source." },
  { ruleId: "hardcoded-secret-assignment", regex: /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|secret[_-]?key|password)\b\s*[:=]\s*(["'])(?![\w-]*(?:example|placeholder|changeme|your[_-]?|dummy|test)[\w-]*\1)[A-Za-z0-9_./+=-]{20,}\1/i, message: "A secret-like value is assigned directly in source." },
];

export class RepositorySecretScanService {
  async scan(workspace: string) {
    const root = path.resolve(workspace);
    const files = await fg(SOURCE_GLOBS, { cwd: root, onlyFiles: true, dot: true, ignore: IGNORE, suppressErrors: true });
    const findings: SecretFinding[] = [];
    let scannedFiles = 0;
    for (const relativePath of files) {
      let source: string;
      try {
        const absolutePath = path.resolve(root, relativePath);
        if (!absolutePath.startsWith(`${root}${path.sep}`)) continue;
        const file = await readFile(absolutePath, "utf8");
        if (Buffer.byteLength(file, "utf8") > 2_000_000) continue;
        source = file;
      } catch { continue; }
      scannedFiles += 1;
      const lines = source.split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const rule of SECRET_RULES) {
          if (!rule.regex.test(line)) continue;
          findings.push({ ruleId: rule.ruleId, severity: "high", filePath: relativePath.replaceAll("\\", "/"), line: index + 1, message: rule.message });
        }
      });
    }
    return { status: "completed" as const, scannedFiles, findingCount: findings.length, findings };
  }
}

export const repositorySecretScanService = new RepositorySecretScanService();
