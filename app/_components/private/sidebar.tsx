"use client";
import { ChevronLeft, ChevronRight, Hexagon } from "lucide-react";
import { useSidebarStore } from "@/store/useSidebarStore";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { NAV_ITEMS } from "@/constants/constants";
import { useAuth } from "@/hooks/useAuth";

const Sidebar = () => {
  const { collapsed, toggleCollapsed } = useSidebarStore();
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) return <div className="w-64 bg-gray-100 animate-pulse" />;
  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.allowedRoles.includes(user.role)
  );

  return (
    <aside
      className={`
        relative h-screen bg-nexus-800/50 backdrop-blur-xl border-r border-white/5 
        transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]
        flex flex-col z-50
        ${collapsed ? "w-20" : "w-64"}
      `}
    >
      {/* logo area */}
      <div
        className={`flex items-center h-20 px-6 ${
          collapsed ? "justify-center" : "justify-start"
        }`}
      >
        <Link href="/dashboard" className="relative group cursor-pointer block">
          {/* wrap logo in link to dashboard */}
          <div className="flex items-center">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 bg-linear-to-r from-cyan-500 to-purple-600 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-200" />
              <div className="relative bg-nexus-900 rounded-lg p-2 flex items-center justify-center border border-white/10">
                <Hexagon className="w-6 h-6 text-cyan-400 fill-cyan-400/20" />
              </div>
            </div>

            <div
              className={`ml-3 overflow-hidden transition-all duration-300 ${
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              }`}
            >
              <h1 className="font-mono font-bold text-xl tracking-tighter text-white">
                NEXUS<span className="text-cyan-400">.</span>OS
              </h1>
            </div>
          </div>
        </Link>
      </div>

      {/* navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
        {visibleItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.id}
              href={item.path}
              className={`
                group flex items-center w-full p-3 rounded-xl transition-all duration-300 relative overflow-hidden
                ${
                  isActive
                    ? "bg-linear-to-r from-cyan-500/10 to-blue-500/5 text-cyan-400 border border-cyan-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }
              `}
            >
              {/* Active Indicator Glow */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
              )}

              <div
                className={`relative z-10 flex items-center ${
                  collapsed ? "justify-center w-full" : ""
                }`}
              >
                <item.icon
                  className={`
                    w-5 h-5 transition-transform duration-300
                    ${
                      isActive
                        ? "scale-110 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]"
                        : "group-hover:scale-110"
                    }
                  `}
                />

                <span
                  className={`
                    ml-3 font-medium text-sm whitespace-nowrap transition-all duration-300
                    ${collapsed ? "opacity-0 w-0 hidden" : "opacity-100 w-auto"}
                  `}
                >
                  {item.label}
                </span>
              </div>

              {/* Hover effect background */}
              {!isActive && (
                <div className="absolute inset-0 bg-white/5 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 rounded-xl" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Toggle */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={toggleCollapsed}
          className="flex items-center justify-center w-full p-3 rounded-xl bg-nexus-700/50 hover:bg-nexus-700 text-slate-400 hover:text-white transition-all duration-200 border border-white/5 hover:border-white/10 group"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          ) : (
            <div className="flex items-center w-full">
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="ml-2 text-xs font-mono uppercase tracking-wider">
                Collapse View
              </span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
