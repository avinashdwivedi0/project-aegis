import type { MouseEvent } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  disabled?: boolean;
  loading?: boolean;
  onClick: (
    event: MouseEvent<HTMLButtonElement>
  ) => void;
};

export default function ImportRepositoryButton({
  disabled = false,
  loading = false,
  onClick,
}: Props) {
  return (
    <Button
      type="button"
      variant="default"
      disabled={disabled || loading}
      onClick={onClick}
    >
      <Download className="mr-2 h-4 w-4" />

      {loading ? "Importing..." : "Import Repository"}
    </Button>
  );
}