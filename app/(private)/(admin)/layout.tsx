import Sidebar from "../../_components/private/sidebar";
import Header from "../../_components/Header";
import RoleGuard from "@/app/_components/private/rolegaurd";

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="flex h-screen w-full bg-nexus-900 overflow-hidden relative selection:bg-cyan-500/30">
        {/* ambient background glows */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[120px]" />
        </div>
        <Sidebar />
        <div className="flex-1 flex flex-col relative z-10 min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
