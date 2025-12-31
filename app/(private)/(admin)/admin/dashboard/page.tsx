"use client";

// This page is automatically protected by our middleware/Role Guard.
// We don't need any special auth checks here.
export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      <h1>Admin Dashboard</h1>
    </div>
  );
}
