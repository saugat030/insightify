export default function TranslateAndExportPreview() {
  return (
    <div className="relative h-full w-full p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-white/10 pb-3">
        <div className="flex gap-3">
          <span className="text-xs font-mono text-zinc-400 bg-white/5 px-2 py-1 rounded">notes.md</span>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">Preview</span>
        </div>
        <button className="text-xs font-bold bg-emerald-500 hover:bg-emerald-400 transition-colors text-black px-3 py-1.5 rounded flex items-center gap-2">
          ↓ Export PDF
        </button>
      </div>
    
      <div className="flex-1 grid grid-cols-2 gap-6 mt-2">
        <div className="font-mono text-[12px] leading-relaxed text-zinc-500 space-y-1 border-r border-white/5 pr-4">
          <p className="text-emerald-400"># Project Roadmap</p>
          <br />
          <p className="text-zinc-300">**Goals for Q3:**</p>
          <p>- Optimize Vector DB queries</p>
          <p>- Implement new translation</p>
          <br />
          <p className="text-zinc-600">{">"} Focus on latency.</p>
        </div>
        <div className="font-sans text-zinc-300 space-y-3">
          <h1 className="text-lg font-bold text-white tracking-tight border-b border-white/10 pb-1">
            Project Roadmap
          </h1>
          <p className="text-[13px] font-semibold text-white">
            Goals for Q3:
          </p>
          <ul className="list-disc list-inside text-[13px] text-zinc-400 space-y-1 marker:text-emerald-500">
            <li>Optimize Vector DB queries</li>
            <li>Implement new translation</li>
          </ul>
          <blockquote className="border-l-2 border-emerald-500 pl-3 text-[13px] italic text-zinc-500 mt-2">
            "Focus on latency."
          </blockquote>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-black to-transparent pointer-events-none"></div>
    </div>
  );
}
