import { Search } from "lucide-react";
import { useState } from "react";

function SearchBar() {
  const [query, setQuery] = useState("");

  return (
    <div className="relative w-full max-w-md">
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
    </div>
  );
}

export default SearchBar;