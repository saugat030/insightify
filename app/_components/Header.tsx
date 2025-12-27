// app/_components/Header.tsx
"use client";

"use client";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export function Header() {
  const { user, logout, isLoading } = useAuth();

  return (
    <header className="flex w-full items-center justify-between border-b border-gray-200 bg-white p-4 shadow-sm">
      {/* App Logo/Title */}
      <Link
        href={user ? "/dashboard" : "/"}
        className="text-xl font-bold text-blue-600"
      >
        LinkLibrarian
      </Link>

      {/* Auth Controls */}
      <div className="flex items-center gap-4">
        {isLoading ? (
          <div className="h-5 w-20 animate-pulse rounded-md bg-gray-200"></div>
        ) : user ? (
          <>
            <span className="hidden text-sm text-gray-700 sm:block">
              Welcome, {user.username}!
            </span>
            <button
              onClick={logout}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-200"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
