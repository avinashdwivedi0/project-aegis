import { useMemo } from "react";

import type { RepositoryFile } from "@/types/repository-file";

import TreeNode from "./TreeNode";
import {
  buildFileTree,
} from "./explorer.utils";
import type {
  TreeNode as ExplorerTreeNode,
} from "./explorer.utils";

type FileTreeProps = {
  files: RepositoryFile[];
  selectedNode: ExplorerTreeNode | null;
  onSelect: (node: ExplorerTreeNode) => void;
};

function FileTree({
  files,
  selectedNode,
  onSelect,
}: FileTreeProps) {
  const tree = useMemo(
    () => buildFileTree(files),
    [files]
  );

  if (tree.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-400">
        No files found.
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          selectedPath={selectedNode?.path ?? null}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export default FileTree;