import fs from "fs";
import path from "path";

export function resolvePromptPath(promptPath: string): string {
  if (path.isAbsolute(promptPath)) return promptPath;

  const candidates = [
    path.resolve(process.cwd(), promptPath),
    path.resolve(process.cwd(), "apps", "api", promptPath),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}
