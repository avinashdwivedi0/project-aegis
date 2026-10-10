import fs from "node:fs/promises";
import path from "node:path";

const EXCLUDED_DIRECTORIES = new Set([
  ".git", "node_modules", "dist", "build", ".next", "out", "venv",
  ".venv", "__pycache__", "coverage",
]);

const PROJECT_MARKERS = new Set([
  "package.json", "tsconfig.json", "requirements.txt", "pyproject.toml",
  "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock",
  "bun.lockb", "Pipfile", "Pipfile.lock", "poetry.lock", "uv.lock",
  "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs", "eslint.config.ts", "eslint.config.mts", "eslint.config.cts",
  ".eslintrc", ".eslintrc.json", ".eslintrc.js", ".eslintrc.cjs",
  ".eslintrc.yaml", ".eslintrc.yml",
]);

export type DiscoveredProject = {
  root: string;
  relativeRoot: string;
  markers: string[];
  hasEslintConfig: boolean;
};

/** Finds project roots up to four directory levels below the repository root. */
export class ProjectDiscoveryService {
  async discover(workspace: string, maxDepth = 4): Promise<DiscoveredProject[]> {
    const absoluteWorkspace = path.resolve(workspace);
    const projects = new Map<string, DiscoveredProject>();
    const visit = async (directory: string, depth: number): Promise<void> => {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      const names = new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name));
      const markers = [...names].filter((name) => PROJECT_MARKERS.has(name)
        || (name.startsWith("eslint.config.") && /\.(?:js|mjs|cjs|ts|mts|cts)$/.test(name))).sort();
      if (names.has("package.json")) {
        try {
          const manifest = JSON.parse(await fs.readFile(path.join(directory, "package.json"), "utf8")) as { eslintConfig?: unknown };
          if (manifest.eslintConfig !== undefined) markers.push("package.json#eslintConfig");
        } catch {
          // A malformed manifest remains a discovered project; the relevant check reports its parse error.
        }
      }
      if (markers.length > 0) {
        const root = path.resolve(directory);
        projects.set(root, {
          root,
          relativeRoot: path.relative(absoluteWorkspace, root).split(path.sep).join("/") || ".",
          markers: [...new Set(markers)].sort(),
          hasEslintConfig: markers.some((marker) => marker.startsWith("eslint.config") || marker.startsWith(".eslintrc") || marker === "package.json#eslintConfig"),
        });
      }
      if (depth >= maxDepth) return;
      for (const entry of entries) {
        if (!entry.isDirectory() || EXCLUDED_DIRECTORIES.has(entry.name)) continue;
        await visit(path.join(directory, entry.name), depth + 1);
      }
    };
    await visit(absoluteWorkspace, 0);
    return [...projects.values()].sort((a, b) => a.relativeRoot.localeCompare(b.relativeRoot));
  }
}

export const projectDiscoveryService = new ProjectDiscoveryService();
