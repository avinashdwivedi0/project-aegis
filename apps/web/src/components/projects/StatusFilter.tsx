type Props = {
  value: string;
  onChange: (value: string) => void;
};

function StatusFilter({
  value,
  onChange,
}: Props) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
      className="
        rounded-xl
        border
        border-slate-700
        bg-slate-900
        px-4
        py-3
      "
    >
      <option value="ALL">
        All Status
      </option>

      <option value="ACTIVE">
        Active
      </option>

      <option value="COMPLETED">
        Completed
      </option>

      <option value="ARCHIVED">
        Archived
      </option>
    </select>
  );
}

export default StatusFilter;