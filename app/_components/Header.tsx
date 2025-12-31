"use client";
import { useAuth } from "@/hooks/useAuth";
import {
  Search,
  Bell,
  Grid,
  LogOut,
  User,
  Settings,
  ChevronDown,
} from "lucide-react";
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

  return (
    <header className="h-20 px-8 flex items-center justify-between sticky top-0 z-40 bg-nexus-900/80 backdrop-blur-md border-b border-white/5">
      {/* Search bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-linear-to-r from-cyan-500/20 to-purple-500/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
          <div className="relative flex items-center bg-nexus-800 rounded-lg border border-white/10 group-focus-within:border-cyan-500/30 transition-colors">
            <Search className="w-5 h-5 ml-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search assets, users, or transactions..."
              className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-200 placeholder-slate-500 py-2.5 px-3 outline-none"
            />
            <div className="mr-2 px-2 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] text-slate-500 font-mono">
              CMD + K
            </div>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-4 ml-6">
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
          <Grid className="w-5 h-5" />
        </button>

        <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
        </button>

        <div className="h-8 w-px bg-white/10 mx-2" />

        {/* user dropdown container */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center space-x-3 group p-1.5 pr-3 rounded-xl transition-all duration-200 ${
              isOpen ? "bg-white/5" : "hover:bg-white/5"
            }`}
          >
            <div className="text-right hidden md:block">
              <div className="text-sm font-medium text-slate-200 group-hover:text-cyan-400 transition-colors capitalize">
                {user?.username || "User"}
              </div>
              <div className="text-xs text-slate-500">{user?.role}</div>
            </div>

            <div className="relative p-0.5 rounded-full bg-linear-to-br from-cyan-400 to-purple-600">
              <div className="rounded-full bg-nexus-900 p-0.5">
                <img
                  src="https://picsum.photos/100/100"
                  alt="User"
                  className="w-8 h-8 rounded-full object-cover"
                />
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* dropdown menu */}
          {isOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-nexus-900 rounded-xl border border-white/10 shadow-xl shadow-black/50 overflow-hidden transform transition-all animate-in fade-in slide-in-from-top-2 z-50">
              <div className="p-2 space-y-1">
                {/* profile link */}
                <button className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-cyan-400 transition-colors">
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>

                {/* settings link */}
                <button className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-cyan-400 transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
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
