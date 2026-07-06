type Props = {
  value: string;
  onChange: (value: string) => void;
};

function ProjectSearch({
  value,
  onChange,
}: Props) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
      placeholder="Search projects..."
      className="
        w-full
        rounded-xl
        border
        border-slate-700
        bg-slate-900
        px-4
        py-3
        outline-none
        transition
        focus:border-cyan-500
      "
    />
  );
}

export default ProjectSearch;