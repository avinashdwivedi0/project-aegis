import { useState } from "react";
import type { RepositoryFile } from "@/types/repository-file";

import FileTree from "./FileTree";
import FileViewer from "./FileViewer";
import type { TreeNode } from "./explorer.utils";

type RepositoryExplorerProps = {
  files: RepositoryFile[];
  loading: boolean;
};

function RepositoryExplorer({
  files,
  loading,
}: RepositoryExplorerProps) {
  

  const [selectedNode, setSelectedNode] =
    useState<TreeNode | null>(null);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 p-6">
        Loading repository...
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 p-6">
        No indexed files found.
      </div>
    );
  }

  return (
    <div className="grid h-175 grid-cols-12 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      {/* Left Sidebar */}

      <div className="col-span-4 overflow-y-auto border-r border-slate-800">
        <div className="border-b border-slate-800 p-4">
          <h2 className="font-semibold">
            Explorer
          </h2>

          <p className="text-xs text-slate-400">
            {files.length} indexed items
          </p>
        </div>

        <FileTree
          files={files}
          selectedNode={selectedNode}
          onSelect={setSelectedNode}
        />
      </div>

      {/* Right Viewer */}

      <div className="col-span-8 overflow-hidden">
        <FileViewer
           repositoryId={files[0]?.repositoryId ?? ""}
          selectedNode={selectedNode}
        />
      </div>
    </div>
  );
}

export default RepositoryExplorer;