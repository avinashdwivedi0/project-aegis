import type { RepositoryFile } from "@/types/repository-file";

export interface TreeNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  parentPath: string | null;
  children: TreeNode[];
}

export function buildFileTree(
  files: RepositoryFile[]
): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const file of files) {
    map.set(file.path, {
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type,
      parentPath: file.parentPath,
      children: [],
    });
  }

  for (const node of map.values()) {
    if (
      node.parentPath &&
      map.has(node.parentPath)
    ) {
      map
        .get(node.parentPath)!
        .children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (
        a.type === "directory" &&
        b.type === "file"
      ) {
        return -1;
      }

      if (
        a.type === "file" &&
        b.type === "directory"
      ) {
        return 1;
      }

      return a.name.localeCompare(b.name);
    });

    nodes.forEach((n) => sort(n.children));
  };

  sort(roots);

  return roots;
}