"use client";
import { Header } from "@/app/_components/Header";
import { NewLinkForm } from "@/app/_components/NewLinkForm";
import { DashboardClient } from "@/app/_components/DashboardClient";

// This page is automatically protected by our middleware.
// We don't need any special auth checks here.
export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* 1. The main header */}
      <Header />

      {/* 2. Main content area */}
      <main className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* 3. The form for adding new links */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Add a New Link
          </h1>
          <NewLinkForm />
        </div>

        {/* 4. The list of existing links */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Your Library
          </h2>
          {/* This component will handle fetching and displaying links */}
          <DashboardClient />
        </div>
      </main>
    </div>
  );
}
