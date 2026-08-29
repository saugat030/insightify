"use client";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const Header = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // handle clicking outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initial = (user?.username || "U").charAt(0).toUpperCase();

  return (
    // Sits on the page background, so it needs its own surface + border to read
    // as chrome rather than blending into the content beneath it.
    <header className="h-20 px-8 flex items-center justify-end sticky top-0 z-40 bg-zinc-900/50 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center space-x-4">
        {/* user dropdown container */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center space-x-3 group p-1.5 pr-3 rounded-xl transition-all duration-200 ${
              isOpen ? "bg-white/5" : "hover:bg-white/5"
            }`}
          >
            <div className="text-right hidden md:block">
              <div className="text-sm font-medium text-zinc-200 group-hover:text-cyan-400 transition-colors capitalize">
                {user?.username || "User"}
              </div>
              <div className="text-xs capitalize text-zinc-500">
                {user?.role}
              </div>
            </div>

            <div className="relative rounded-full bg-linear-to-br from-cyan-400 to-purple-600 p-0.5">
              {user?.profilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profilePicture}
                  alt={user.username || "User"}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-zinc-200">
                  {initial}
                </div>
              )}
            </div>

            <ChevronDown
              className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* dropdown menu — opaque so the page content can't bleed through */}
          {isOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 rounded-xl border border-white/10 bg-zinc-900 shadow-xl shadow-black/50 overflow-hidden transform transition-all animate-in fade-in slide-in-from-top-2 z-50">
              <div className="p-2">
                {/* profile link */}
                <button className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-white/5 hover:text-cyan-400 transition-colors">
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>
              </div>

              <div className="h-px bg-white/10 mx-2" />

              <div className="p-2">
                {/* logout button */}
                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
