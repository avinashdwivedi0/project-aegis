import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useParams } from "react-router-dom";

import {
  CreateRepositoryModal,
  DeleteRepositoryModal,
  EditRepositoryModal,
  EmptyRepositories,
  LoadingRepositories,
  ProviderFilter,
  RepositoryGrid,
  RepositorySearch,
  RepositoryStatusFilter,
} from "@/components/repositories";

import { useRepositories } from "@/hooks/useRepositories";

import type {
  Repository,
  RepositoryProvider,
  RepositoryStatus,
} from "@/types/repository";

function RepositoryPage() {
  const { projectId } = useParams<{
    projectId: string;
  }>();

  const safeProjectId = projectId ?? "";

  const {
    repositories,
    loading,
    refresh,
  } = useRepositories(safeProjectId);

  const [search, setSearch] =
    useState("");

  const [provider, setProvider] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [createOpen, setCreateOpen] =
    useState(false);

  const [editOpen, setEditOpen] =
    useState(false);

  const [deleteOpen, setDeleteOpen] =
    useState(false);

  const [
    selectedRepository,
    setSelectedRepository,
  ] = useState<Repository | null>(
    null
  );

  function handleEdit(
    repository: Repository
  ) {
    setSelectedRepository(repository);
    setEditOpen(true);
  }

  function handleDelete(
    repository: Repository
  ) {
    setSelectedRepository(repository);
    setDeleteOpen(true);
  }

  const filteredRepositories =
    useMemo(() => {
      return repositories.filter(
        (repository) => {
          const matchesSearch =
            repository.name
              .toLowerCase()
              .includes(
                search.toLowerCase()
              ) ||
            (
              repository.description ??
              ""
            )
              .toLowerCase()
              .includes(
                search.toLowerCase()
              );

          const matchesProvider =
            provider === "" ||
            repository.provider ===
              (provider as RepositoryProvider);

          const matchesStatus =
            status === "" ||
            repository.status ===
              (status as RepositoryStatus);

          return (
            matchesSearch &&
            matchesProvider &&
            matchesStatus
          );
        }
      );
    }, [
      repositories,
      search,
      provider,
      status,
    ]);

  if (!projectId) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
        Invalid project.
      </div>
    );
  }

  if (loading) {
    return <LoadingRepositories />;
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Repositories
          </h1>

          <p className="mt-2 text-slate-400">
            Manage project repositories.
          </p>
        </div>

        <button
          onClick={() =>
            setCreateOpen(true)
          }
          className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 font-medium transition hover:bg-cyan-500"
        >
          <Plus size={18} />
          New Repository
        </button>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <RepositorySearch
          value={search}
          onChange={setSearch}
        />

        <ProviderFilter
          value={provider}
          onChange={setProvider}
        />

        <RepositoryStatusFilter
          value={status}
          onChange={setStatus}
        />
      </div>

      {/* Content */}
      {filteredRepositories.length ===
      0 ? (
        <EmptyRepositories
          onCreate={() =>
            setCreateOpen(true)
          }
        />
      ) : (
        <RepositoryGrid
          repositories={
            filteredRepositories
          }
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Create */}
      <CreateRepositoryModal
        open={createOpen}
        projectId={projectId}
        loading={false}
        onClose={() =>
          setCreateOpen(false)
        }
        onCreated={refresh}
      />

      {/* Edit */}
      <EditRepositoryModal
        open={editOpen}
        repository={selectedRepository}
        loading={false}
        onClose={() =>
          setEditOpen(false)
        }
        onUpdated={refresh}
      />

      {/* Delete */}
      <DeleteRepositoryModal
        open={deleteOpen}
        repository={selectedRepository}
        onClose={() =>
          setDeleteOpen(false)
        }
        onDeleted={refresh}
      />
    </>
  );
}

export default RepositoryPage;