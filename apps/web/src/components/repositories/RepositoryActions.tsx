import {
  FolderOpen,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  loading?: boolean;
  onRefresh: () => void;
  onReindex: () => void;
  onOpenWorkspace: () => void;
  onDeleteWorkspace: () => void;
};

function RepositoryActions({
  loading = false,
  onRefresh,
  onReindex,
  onOpenWorkspace,
  onDeleteWorkspace,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        disabled={loading}
        onClick={onRefresh}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Refresh
      </Button>

      <Button
        disabled={loading}
        onClick={onReindex}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Re-index
      </Button>

      <Button
        variant="secondary"
        disabled={loading}
        onClick={onOpenWorkspace}
      >
        <FolderOpen className="mr-2 h-4 w-4" />
        Open Workspace
      </Button>

      <Button
        variant="destructive"
        disabled={loading}
        onClick={onDeleteWorkspace}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete Workspace
      </Button>
    </div>
  );
}

export default RepositoryActions;