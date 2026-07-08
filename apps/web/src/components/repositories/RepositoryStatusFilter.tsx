import type { RepositoryStatus } from "@/types/repository";

type Props = {
  value: string;
  onChange: (value: RepositoryStatus | "") => void;
};

function RepositoryStatusFilter({
  value,
  onChange,
}: Props) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(
          e.target.value as RepositoryStatus | ""
        )
      }
      className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-500"
    >
      <option value="">
        All Status
      </option>

      <option value="ACTIVE">
        Active
      </option>

      <option value="INDEXING">
        Indexing
      </option>

      <option value="INDEXED">
        Indexed
      </option>

      <option value="FAILED">
        Failed
      </option>

      <option value="ARCHIVED">
        Archived
      </option>
    </select>
  );
}

export default RepositoryStatusFilter;