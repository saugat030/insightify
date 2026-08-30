type BrowserFrameProps = {
  tabTitle: string;
  // mock url purely decorative
  url: string;
  favicon?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  decorative?: boolean;
  className?: string;
};

// todo: change to the actual logo
export function InsightifyFavicon() {
  return (
    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm bg-white text-black">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-2.5 w-2.5"
      >
        <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .75c.799 0 1.571-.059 2.308-.17 1.348-.204 2.651-.621 3.868-1.22l.509-.254.55-.274a7.973 7.973 0 012.525 0l.55.274.509.254a14.394 14.394 0 003.868 1.22c.736.111 1.509.17 2.308.17a.75.75 0 001-.75V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v8.152l-.46.23c-1.222.608-2.673.608-3.895 0l-.46-.23V4.533zM12 14.73a6.45 6.45 0 00-1.954-.954l-1.636-.546a.75.75 0 00-.316 1.41l1.635.546c.55.183 1.13.315 1.725.392v-3.79c0-.414.336-.75.75-.75s.75.336.75.75v3.79c.594-.077 1.174-.21 1.725-.392l1.635-.546a.75.75 0 00-.316-1.41l-1.636.546c-.672.224-1.326.544-1.954.954z" />
      </svg>
    </span>
  );
}

export default function BrowserFrame({
  tabTitle,
  url,
  favicon,
  children,
  contentClassName = "",
  decorative = false,
  className = "",
}: BrowserFrameProps) {
  return (
    <div
      aria-hidden={decorative || undefined}
      className={`relative flex flex-col overflow-hidden bg-[#0c0c0e] text-left ${decorative ? "pointer-events-none select-none " : ""}${className || "h-full w-full"}`}
    >
      {/* browser title bar */}
      <div className="relative z-20 flex shrink-0 flex-col border-b border-white/5 bg-[#18181b]">
        {/* window controls + tab */}
        <div className="flex items-center space-x-4 px-4 pb-2 pt-3">
          <div className="flex space-x-2">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <div className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex flex-1 text-xs text-zinc-400">
            <div className="flex items-center gap-2 rounded-t-md border-x border-t border-white/10 bg-[#27272a] px-4 py-1.5 shadow-sm">
              {favicon ?? <InsightifyFavicon />}
              <span className="truncate">{tabTitle}</span>
            </div>
          </div>
        </div>

        {/* address bar */}
        <div className="flex items-center gap-4 bg-[#27272a] px-4 py-2">
          <div className="flex gap-3 text-zinc-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </div>
          <div className="flex flex-1 items-center rounded-md border border-white/5 bg-[#18181b] px-3 py-1.5 text-xs text-zinc-300 shadow-inner">
            <svg className="mr-2 h-3 w-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <span className="truncate">{url}</span>
          </div>
        </div>
      </div>

      {/* viewport */}
      <div className={`relative min-h-0 flex-1 overflow-hidden ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
