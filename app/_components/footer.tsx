export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black py-12 relative z-10 mt-auto">
      <div className="container mx-auto px-6 flex flex-col items-center justify-between gap-6 md:flex-row">
        <p className="text-sm text-zinc-500">
          © {new Date().getFullYear()} Insightify Inc. All rights reserved.
        </p>
        <div className="flex gap-6 text-sm text-zinc-500">
          <a href="#" className="hover:text-white transition-colors">
            Twitter
          </a>
          <a href="#" className="hover:text-white transition-colors">
            GitHub
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Discord
          </a>
        </div>
      </div>
    </footer>
  );
}
