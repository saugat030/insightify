import { DashboardClient } from "@/app/_components/DashboardClient";
import { NewLinkForm } from "@/app/_components/NewLinkForm";

const LinkPage = () => {
  return (
    <div className="p-8 space-y-8">
      {/* Header Section */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Links <span className="text-cyan-400">.</span>
          </h1>
          <p className="text-slate-400">
            Manage your saved links and resources.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-1">
          <div className="nexus-card bg-nexus-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm sticky top-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              Add New
              <div className="h-px grow bg-white/10" />
            </h2>
            <NewLinkForm />
          </div>
        </div>

        {/* Right Column: List */}
        <div className="lg:col-span-2">
          <DashboardClient />
        </div>
      </div>
    </div>
  );
};

export default LinkPage;
