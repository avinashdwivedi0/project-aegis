import {
  ChevronDown,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);

  const initials =
    user?.name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase() ?? "?";

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[#f3f6fa]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#172033] text-sm font-bold text-white">
          {initials}
        </div>

        <div className="text-left">
          <p className="font-semibold">
            {user?.name}
          </p>

          <p className="text-sm text-[#667085]">
            {user?.role}
          </p>
        </div>

        <ChevronDown size={18} />
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-lg border border-[#dfe4eb] bg-white text-[#344054] shadow-xl">
          <button
            className="flex w-full items-center gap-3 px-5 py-4 transition hover:bg-[#f3f6fa]"
            onClick={() => {
              navigate("/settings");
              setOpen(false);
            }}
          >
            <User size={18} />
            My Profile
          </button>

          <button
            className="flex w-full items-center gap-3 px-5 py-4 transition hover:bg-[#f3f6fa]"
            onClick={() => {
              navigate("/settings");
              setOpen(false);
            }}
          >
            <Settings size={18} />
            Settings
          </button>

          <div className="border-t border-[#edf0f4]" />

          <button
            className="flex w-full items-center gap-3 px-5 py-4 text-[#b42318] transition hover:bg-[#fff1f0]"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;