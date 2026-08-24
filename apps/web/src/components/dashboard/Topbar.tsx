import SearchBar from "@/components/dashboard/SearchBar";
import NotificationDropdown from "@/components/dashboard/NotificationDropdown";
import UserMenu from "@/components/dashboard/UserMenu";
import HamburgerButton from "@/components/dashboard/HamburgerButton";

function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#dfe4eb] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      {/* Left */}
      <div className="flex items-center gap-4">
        <HamburgerButton />

        <div className="hidden md:block">
          <SearchBar />
        </div>

          <h2 className="text-lg font-semibold text-[#172033] md:hidden">
          Dashboard
        </h2>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 md:gap-5">
        <NotificationDropdown />

        <UserMenu />
      </div>
    </header>
  );
}

export default Topbar;