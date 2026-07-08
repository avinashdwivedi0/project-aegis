import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

function RepositorySearch({
  value,
  onChange,
}: Props) {
  return (
    <div className="relative w-full max-w-md">
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
      />

      <input
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder="Search repositories..."
        className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-500"
      />
    </div>
  );
}

export default RepositorySearch;