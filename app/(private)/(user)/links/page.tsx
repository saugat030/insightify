import { DashboardClient } from "@/app/_components/DashboardClient";
import { NewLinkForm } from "@/app/_components/NewLinkForm";

const LinkPage = () => {
  return (
    <div className="min-h-full flex flex-col">
      {/* Hero / Header Section */}
      <div className="relative border-b border-white/10 bg-nexus-900/40 backdrop-blur-md z-10 px-8 py-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]" />
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />
        </div>
        
        <div className="relative max-w-5xl mx-auto space-y-6">
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
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <DashboardClient />
      </div>
    </div>
  );
};

export default LinkPage;
