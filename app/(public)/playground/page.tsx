"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Panel, Group, Separator } from "react-resizable-panels";
import { FileDown, Lock, Plus, Save, Sparkles } from "lucide-react";

import { DEFAULT_MARKDOWN } from "@/constants/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// A public, in-memory-only markdown playground. It deliberately does NOT:
//  - persist to the database or localStorage (nothing is saved anywhere)
//  - export to PDF
//  - allow more than one document/tab
// Those are premium features, gated behind a subscription tooltip.

// A locked control: styled like an action button but inert. It is intentionally
// NOT `disabled` so the tooltip still fires on hover, and its onClick is a no-op.
function LockedButton({
  children,
  tooltip,
  className = "",
}: {
  children: React.ReactNode;
  tooltip: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-disabled="true"
          onClick={(e) => e.preventDefault()}
          className={`flex items-center gap-1.5 cursor-not-allowed select-none ${className}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-1.5">
        <Sparkles className="h-3 w-3" />
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export default function PlaygroundPage() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);

  return (
    <div className="mt-16 h-[calc(100vh-4rem)]">
      <div className="flex flex-col h-full bg-[#0e0e10]">
        {/* tab bar */}
        <div className="flex items-end gap-0 bg-[#0e0e10] px-2 pt-2 overflow-x-auto scrollbar-hide border-b border-white/5 shrink-0">
          {/* single, fixed demo tab */}
          <div className="group relative flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg max-w-[200px] min-w-[120px] shrink-0 bg-[#1a1a1e] text-white border-t border-x border-white/10 -mb-px z-10">
            <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
            <span className="truncate">playground.md</span>
          </div>

          {/* new tab button (gated) */}
          <LockedButton
            tooltip="Subscribe to work with multiple documents"
            className="h-8 w-8 ml-1 mb-0.5 rounded-md justify-center text-zinc-600 hover:bg-white/5 transition-all"
          >
            <Plus className="h-4 w-4" />
          </LockedButton>
        </div>

        {/* toolbar */}
        <header className="flex justify-between items-center px-4 py-3 bg-[#1a1a1e] border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-white tracking-tight max-w-[200px] truncate">
              playground.md
            </h1>
            <span className="text-[10px] text-amber-400/90 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              Demo — changes aren&apos;t saved
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* save (gated) */}
            <LockedButton
              tooltip="Subscription required to save your work"
              className="px-3 py-1.5 bg-white/5 text-zinc-400 text-xs font-medium rounded-md border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Lock className="h-3 w-3" />
              Save
            </LockedButton>

            {/* export (gated) */}
            <LockedButton
              tooltip="Subscription required to export as PDF"
              className="px-3 py-1.5 bg-blue-600/40 text-white/70 text-xs font-medium rounded-md border border-blue-500/30 hover:bg-blue-600/50 transition-colors"
            >
              <Lock className="h-3 w-3" />
              <FileDown className="h-3 w-3" />
              Export to PDF
            </LockedButton>
          </div>
        </header>

        {/* split plane */}
        <main className="flex-1 overflow-hidden min-h-0">
          <Group orientation="horizontal">
            <Panel defaultSize={50} minSize={20}>
              <div className="h-full p-3">
                <textarea
                  className="w-full h-full p-4 resize-none rounded-lg border border-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 bg-[#131316] text-zinc-200 font-mono text-sm leading-relaxed placeholder:text-zinc-600"
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="Type or paste your Markdown here..."
                  spellCheck={false}
                />
              </div>
            </Panel>
            <Separator className="w-1.5 bg-[#1a1a1e] hover:bg-blue-500/30 cursor-col-resize transition-colors flex flex-col justify-center items-center">
              <div className="w-0.5 h-8 bg-zinc-700 rounded-full" />
            </Separator>

            <Panel defaultSize={50} minSize={20}>
              <div className="h-full overflow-y-auto p-3">
                <div className="bg-[#131316] p-6 min-h-full rounded-lg border border-white/5">
                  <article className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-zinc-300 prose-a:text-blue-400 prose-strong:text-white prose-code:text-emerald-400 prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5">
                    <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
                  </article>
                </div>
              </div>
            </Panel>
          </Group>
        </main>
      </div>
    </div>
  );
}
