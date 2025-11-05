// app/page.tsx
import { Header } from "@/app/_components/Header";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* 1. We include the header here */}
      <Header />

      {/* 2. Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="max-w-3xl px-4">
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-gray-900 md:text-6xl">
            Stop losing links. Start gaining insight.
          </h1>
          <p className="mb-8 text-lg text-gray-600 md:text-xl">
            Welcome to{" "}
            <span className="font-medium text-blue-600">LinkLibrarian</span>.
            Save any URL, and we'll use AI to automatically summarize and tag it
            for you. Your personal, searchable library.
          </p>
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700"
            >
              Get Started for Free
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-100"
            >
              Login
            </Link>
          </div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="w-full p-4 text-center text-sm text-gray-500">
        Built for a portfolio.
      </footer>
    </div>
  );
}
