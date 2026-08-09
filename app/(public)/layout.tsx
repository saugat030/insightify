import { Navbar } from "@/app/_components/navbar";
import Footer from "@/app/_components/footer";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden flex flex-col bg-background text-foreground selection:bg-white/20 font-outfit">
      <div className="noise" />
      <div className="bg-grid fixed inset-0 z-0 opacity-20 pointer-events-none" />
      <Navbar />
      <div className="flex-1 flex flex-col w-full">
        {children}
      </div>
      <Footer />
    </div>
  );
}
