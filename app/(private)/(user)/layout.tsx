import Sidebar from "../../_components/private/sidebar";
import Header from "../../_components/header";
import RoleGuard from "@/app/_components/private/rolegaurd";
import { VaultProvider } from "@/hooks/useVault";
import { Toaster } from "@/components/ui/sonner";

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RoleGuard allowedRoles={["user"]}>
      <VaultProvider>
        <div className="flex h-screen w-full bg-nexus-900 overflow-hidden relative selection:bg-cyan-500/30 font-outfit">
          <Sidebar />
          <div className="flex-1 flex flex-col relative z-10 min-w-0">
            <Header />
            <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </VaultProvider>
    </RoleGuard>
  );
}
