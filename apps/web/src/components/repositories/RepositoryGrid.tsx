import type {
  Repository,
} from "@/types/repository";

import RepositoryCard from "./RepositoryCard";

type Props = {
  repositories: Repository[];

  onEdit: (
    repository: Repository
  ) => void;

  onDelete: (
    repository: Repository
  ) => void;

  onIndex: (
    repository: Repository
  ) => Promise<void>;

  isRepositoryIndexing: (
    id: string
  ) => boolean;
};

function RepositoryGrid({
  repositories,
  onEdit,
  onDelete,
  onIndex,
  isRepositoryIndexing,
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
      {repositories.map(
        (repository) => (
          <RepositoryCard
            key={repository.id}
            repository={repository}
            indexing={
              isRepositoryIndexing(
                repository.id
              )
            }
            onEdit={onEdit}
            onDelete={onDelete}
            onIndex={onIndex}
          />
        )
      )}
    </div>
  );
}

export default RepositoryGrid;