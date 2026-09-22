import path from "path";

export function resolveWorkspacePath(
  workspace: string,
  relativePath: string,
): string {
  const root = path.resolve(workspace);
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);

  if (
    relative === "" ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Invalid workspace file path.");
  }

  return resolved;
}
