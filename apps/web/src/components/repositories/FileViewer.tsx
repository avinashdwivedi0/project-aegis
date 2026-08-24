import type { TreeNode } from "./explorer.utils";

import { useFileContent } from "@/hooks/useFileContent";
import CodeEditor from "./CodeEditor";

type FileViewerProps = {
  repositoryId: string;
  selectedNode: TreeNode | null;
};

function FileViewer({
  repositoryId,
  selectedNode,
}: FileViewerProps) {
  const isFile =
    selectedNode?.type === "file";

  const { file, loading } =
    useFileContent(
      repositoryId,
      isFile ? selectedNode.path : null
    );

  if (!selectedNode) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Select a file to view its contents.
      </div>
    );
  }

  if (selectedNode.type === "directory") {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Folder: {selectedNode.path}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Unable to load file.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="font-semibold">
          {file.name}
        </h2>

        <p className="text-xs text-slate-400">
          {file.path}
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <CodeEditor
            language={file.language || "text"}
            value={file.content}
        />
    </div>
    </div>
  );
}

export default FileViewer;