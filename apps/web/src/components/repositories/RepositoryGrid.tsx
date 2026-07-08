import type { Repository } from "@/types/repository";

import RepositoryCard from "./RepositoryCard";

type Props = {
  repositories: Repository[];
  onEdit: (repository: Repository) => void;
  onDelete: (repository: Repository) => void;
};

function RepositoryGrid({
  repositories,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div
      className="
        grid
        gap-6
        sm:grid-cols-2
        xl:grid-cols-3
      "
    >
      {repositories.map((repository) => (
        <RepositoryCard
          key={repository.id}
          repository={repository}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default RepositoryGrid;