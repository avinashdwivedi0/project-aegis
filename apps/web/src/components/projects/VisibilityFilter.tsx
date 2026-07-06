type Props = {
  value: string;
  onChange: (value: string) => void;
};

function VisibilityFilter({
  value,
  onChange,
}: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="
        rounded-xl
        border
        border-slate-700
        bg-slate-900
        px-4
        py-3
        text-white
        outline-none
        transition
        focus:border-cyan-500
      "
    >
      <option value="ALL">
        All Visibility
      </option>

      <option value="PRIVATE">
        Private
      </option>

      <option value="TEAM">
        Team
      </option>

      <option value="PUBLIC">
        Public
      </option>
    </select>
  );
}

export default VisibilityFilter;