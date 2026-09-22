import fs from "fs/promises";
import path from "path";

export type ProjectProfile = {
  rootPath: string;
  projectType: "javascript" | "python" | "java" | "go" | "rust" | "dotnet" | "unknown";
  languages: string[];
  frameworks: string[];
  packageManagers: string[];
  buildCommands: string[];
  testCommands: string[];
  entryPoints: string[];
  filesScanned: number;
};

const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
  "target",
  "bin",
  "obj",
  "__pycache__",
]);

const extensionLanguages: Record<string, string> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".java": "java",
  ".kt": "kotlin",
  ".go": "go",
  ".rs": "rust",
  ".cs": "csharp",
};

export class ProjectAnalyzerService {
  async analyze(rootPath: string): Promise<ProjectProfile> {
    const files = await this.collectFiles(rootPath);
    const languages = new Set<string>();
    const packageManagers = new Set<string>();
    const frameworks = new Set<string>();
    const buildCommands = new Set<string>();
    const testCommands = new Set<string>();
    const entryPoints: string[] = [];

    for (const filePath of files) {
      const relativePath = path.relative(rootPath, filePath);
      const extension = path.extname(filePath).toLowerCase();
      const language = extensionLanguages[extension];

      if (language) languages.add(language);

      const fileName = path.basename(filePath).toLowerCase();
      if (fileName === "package.json") packageManagers.add("npm-compatible");
      if (fileName === "pnpm-lock.yaml") packageManagers.add("pnpm");
      if (fileName === "yarn.lock") packageManagers.add("yarn");
      if (fileName === "package-lock.json") packageManagers.add("npm");
      if (fileName === "requirements.txt" || fileName === "pyproject.toml") packageManagers.add("pip");
      if (fileName === "pom.xml") packageManagers.add("maven");
      if (fileName === "build.gradle" || fileName === "build.gradle.kts") packageManagers.add("gradle");
      if (fileName === "go.mod") packageManagers.add("go modules");
      if (fileName === "cargo.toml") packageManagers.add("cargo");
      if (extension === ".csproj") packageManagers.add("dotnet");

      if (/^(src[\\/])?(main|index|app|server)\.(js|jsx|ts|tsx|py|go|rs)$/.test(relativePath)) {
        entryPoints.push(relativePath);
      }
    }

    const packageJsonPath = path.join(rootPath, "package.json");
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8")) as {
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      for (const framework of ["react", "express", "next", "vite", "nestjs", "fastify", "vue", "angular"]) {
        if (dependencies[framework] || Object.keys(dependencies).some((name) => name.startsWith(`@${framework}/`))) {
          frameworks.add(framework);
        }
      }

      for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
        if (["build", "compile", "typecheck"].includes(name)) buildCommands.add(`pnpm run ${name}`);
        if (["test", "lint", "check"].includes(name)) testCommands.add(`pnpm run ${name}`);
        if (name === "dev" || name === "start") entryPoints.push(`script:${name}`);
        void command;
      }
    } catch {
      // Projects without package.json are still profiled from their files.
    }

    const projectType = this.detectProjectType(languages, packageManagers);

    return {
      rootPath,
      projectType,
      languages: [...languages].sort(),
      frameworks: [...frameworks].sort(),
      packageManagers: [...packageManagers].sort(),
      buildCommands: [...buildCommands].sort(),
      testCommands: [...testCommands].sort(),
      entryPoints: [...new Set(entryPoints)].sort(),
      filesScanned: files.length,
    };
  }

  private async collectFiles(directory: string): Promise<string[]> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) files.push(...await this.collectFiles(filePath));
      else files.push(filePath);
    }

    return files;
  }

  private detectProjectType(languages: Set<string>, packageManagers: Set<string>): ProjectProfile["projectType"] {
    if (languages.has("typescript") || languages.has("javascript")) return "javascript";
    if (languages.has("python")) return "python";
    if (languages.has("java") || languages.has("kotlin")) return "java";
    if (languages.has("go")) return "go";
    if (languages.has("rust")) return "rust";
    if (languages.has("csharp") || packageManagers.has("dotnet")) return "dotnet";
    return "unknown";
  }
}
