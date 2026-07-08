import type { RepositoryProvider } from "@/types/repository";

type Props = {
  value: string;
  onChange: (value: RepositoryProvider | "") => void;
};

function ProviderFilter({
  value,
  onChange,
}: Props) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(
          e.target.value as RepositoryProvider | ""
        )
      }
      className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-500"
    >
      <option value="">
        All Providers
      </option>

      <option value="LOCAL">
        Local
      </option>

      <option value="GITHUB">
        GitHub
      </option>

      <option value="ZIP">
        ZIP
      </option>
    </select>
  );
}

export default ProviderFilter;