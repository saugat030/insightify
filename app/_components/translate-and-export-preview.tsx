import { Lock, ShieldCheck } from "lucide-react";

// A faithful, NON-INTERACTIVE mock of the real Markdown editor
// (app/(private)/(user)/editor/page.tsx), used in the homepage feature showcase.
//
// It deliberately mirrors the real editor's chrome — tab bar with the encrypted
// lock indicator, the "auto-saved" badge, the vault (Encrypted) toggle and the
// Export to PDF button, and the split source/preview panes — so the marketing
// preview matches what a user actually gets.
//
// Everything is plain markup (no inputs/buttons) and the whole tree is
// pointer-events-none + aria-hidden, so it reads as an image to both the mouse
// and to screen readers.

const SOURCE = `# Project Roadmap

**Goals for Q3:**
- Optimize vector queries
- Ship the translation layer

> Focus on latency.`;

export default function TranslateAndExportPreview() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full flex-col bg-[#0e0e10] pointer-events-none select-none"
    >
      {/* tab bar — mirrors the real editor's tabs */}
      <div className="flex shrink-0 items-end gap-0 border-b border-white/5 bg-[#0e0e10] px-2 pt-2">
        {/* active tab: encrypted (lock icon, like a vault-enabled doc) */}
        <div className="relative z-10 -mb-px flex min-w-[120px] max-w-[200px] shrink-0 items-center gap-2 rounded-t-lg border-x border-t border-white/10 bg-[#1a1a1e] px-4 py-2.5 text-xs font-medium text-white">
          <Lock className="h-3 w-3 shrink-0 text-emerald-400" />
          <span className="truncate">roadmap.md</span>
        </div>

        {/* inactive plaintext tab */}
        <div className="flex min-w-[120px] max-w-[200px] shrink-0 items-center gap-2 rounded-t-lg border-x border-t border-transparent px-4 py-2.5 text-xs font-medium text-zinc-500">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" />
          <span className="truncate">notes.md</span>
        </div>

        {/* new tab affordance */}
        <div className="ml-1 mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm text-zinc-500">
          +
        </div>
      </div>

      {/* toolbar — title, save state, vault toggle, export */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/5 bg-[#1a1a1e] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="max-w-[200px] truncate text-sm font-semibold tracking-tight text-white">
            roadmap.md
          </span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">
            auto-saved
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* vault toggle in its active (encrypted) state */}
          <span className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Encrypted
          </span>
          <span className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white">
            Export to PDF
          </span>
        </div>
      </div>

      {/* split plane: raw markdown | rendered preview */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* source pane */}
        <div className="h-full w-1/2 p-3">
          <pre className="h-full w-full overflow-hidden whitespace-pre-wrap rounded-lg border border-white/5 bg-[#131316] p-4 font-mono text-[11px] leading-relaxed text-zinc-200">
            {SOURCE}
          </pre>
        </div>

        {/* resizer grip */}
        <div className="flex w-1.5 shrink-0 flex-col items-center justify-center bg-[#1a1a1e]">
          <div className="h-8 w-0.5 rounded-full bg-zinc-700" />
        </div>

        {/* rendered preview pane */}
        <div className="h-full w-1/2 overflow-hidden p-3">
          <div className="h-full rounded-lg border border-white/5 bg-[#131316] p-5">
            <h1 className="mb-3 border-b border-white/10 pb-2 text-base font-bold tracking-tight text-white">
              Project Roadmap
            </h1>
            <p className="mb-2 text-[12px] font-semibold text-white">
              Goals for Q3:
            </p>
            <ul className="mb-3 list-inside list-disc space-y-1 text-[12px] text-zinc-300 marker:text-zinc-500">
              <li>Optimize vector queries</li>
              <li>Ship the translation layer</li>
            </ul>
            <blockquote className="border-l-2 border-zinc-600 pl-3 text-[12px] italic text-zinc-400">
              Focus on latency.
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}
