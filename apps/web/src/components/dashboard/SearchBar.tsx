import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

function SearchBar() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized) return;
    navigate(`/projects?search=${encodeURIComponent(normalized)}`);
  }

  return (
    <form onSubmit={submitSearch} className="relative w-full max-w-md">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3]"
      />

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search projects, repositories, reports..."
        className="w-full rounded-lg border border-[#dfe4eb] bg-[#fbfcfe] py-3 pl-11 pr-4 text-sm text-[#172033] outline-none transition-all duration-200 placeholder:text-[#98a2b3] focus:border-[#1264d8] focus:ring-2 focus:ring-[#1264d8]/15"
      />
      <button type="submit" aria-label="Search projects" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-[#1264d8] hover:bg-[#e8f1ff]">Search</button>
    </form>
  );
}

export default SearchBar;
