import { DashboardClient } from "@/app/_components/dashboard-client";
import { NewLinkForm } from "@/app/_components/new-link-form";

const LinkPage = () => {
  return (
    <div className="min-h-full flex flex-col">
      {/* Hero / Header Section */}
      <div className="relative border-b border-white/10 backdrop-blur-md z-10 px-8 py-10">
          <div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
              Knowledge Base <span className="text-cyan-400">.</span>
            </h1>
            <p className="text-slate-400 text-lg">
              Save, categorize, and let AI extract key insights from your favorite links.
            </p>
          </div>

          <div className="bg-black/30 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
             <NewLinkForm />
          </div>
      </div>
      {/* Main Content Area */}
      <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <DashboardClient />
      </div>
    </div>
  );
};

export default LinkPage;
