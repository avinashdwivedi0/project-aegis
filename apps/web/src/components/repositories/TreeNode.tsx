import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
} from "lucide-react";

import type { TreeNode as TreeNodeType } from "./explorer.utils";

type Props = {
  node: TreeNodeType;
  level?: number;
  selectedPath: string | null;
  onSelect: (node: TreeNodeType) => void;
};

function TreeNode({
  node,
  level = 0,
  selectedPath,
  onSelect,
}: Props) {
  const [expanded, setExpanded] = useState(level < 1);

  const isDirectory = node.type === "directory";
  const isSelected = selectedPath === node.path;

  const toggle = () => {
    if (isDirectory) {
      setExpanded((prev) => !prev);
    }

    onSelect(node);
  };

  return (
    <>
      <div
        onClick={toggle}
        className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-800 ${
          isSelected ? "bg-slate-800" : ""
        }`}
        style={{
          paddingLeft: `${level * 16 + 8}px`,
        }}
      >
        {isDirectory ? (
          expanded ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )
        ) : (
          <span className="w-4" />
        )}

        {isDirectory ? (
          expanded ? (
            <FolderOpen
              size={16}
              className="text-yellow-400"
            />
          ) : (
            <Folder
              size={16}
              className="text-yellow-400"
            />
          )
        ) : (
          <FileText
            size={16}
            className="text-slate-400"
          />
        )}

        <span className="truncate text-sm">
          {node.name}
        </span>
      </div>

      {isDirectory &&
        expanded &&
        node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            level={level + 1}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
    </>
  );
}

export default TreeNode;