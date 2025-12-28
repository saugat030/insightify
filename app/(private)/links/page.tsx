import { DashboardClient } from "@/app/_components/DashboardClient";
import { NewLinkForm } from "@/app/_components/NewLinkForm";

const LinkPage = () => {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
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
};

export default LinkPage;
