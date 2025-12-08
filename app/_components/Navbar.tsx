// app/_components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .75c.799 0 1.571-.059 2.308-.17 1.348-.204 2.651-.621 3.868-1.22l.509-.254.55-.274a7.973 7.973 0 012.525 0l.55.274.509.254a14.394 14.394 0 003.868 1.22c.736.111 1.509.17 2.308.17a.75.75 0 001-.75V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v8.152l-.46.23c-1.222.608-2.673.608-3.895 0l-.46-.23V4.533zM12 14.73a6.45 6.45 0 00-1.954-.954l-1.636-.546a.75.75 0 00-.316 1.41l1.635.546c.55.183 1.13.315 1.725.392v-3.79c0-.414.336-.75.75-.75s.75.336.75.75v3.79c.594-.077 1.174-.21 1.725-.392l1.635-.546a.75.75 0 00-.316-1.41l-1.636.546c-.672.224-1.326.544-1.954.954z" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight text-white">
              Insightify
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link 
              href="/features" 
              className={`transition-colors hover:text-white ${isActive('/features') ? 'text-white' : 'text-zinc-400'}`}
            >
              Features
            </Link>
            <Link 
              href="/workflow" 
              className={`transition-colors hover:text-white ${isActive('/workflow') ? 'text-white' : 'text-zinc-400'}`}
            >
              Workflow
            </Link>
            <Link 
              href="/pricing" 
              className={`transition-colors hover:text-white ${isActive('/pricing') ? 'text-white' : 'text-zinc-400'}`}
            >
              Why Us
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/login"
            className="text-zinc-400 transition-colors hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="group relative flex h-9 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5 px-4 transition-all hover:bg-white/10"
          >
            <span className="relative z-10 text-white group-hover:text-white">
              Get Started
            </span>
            <div className="absolute inset-0 -z-10 translate-y-full bg-gradient-to-t from-zinc-800 to-transparent transition-transform duration-300 group-hover:translate-y-0" />
          </Link>
        </div>
      </div>
    </header>
  );
}
