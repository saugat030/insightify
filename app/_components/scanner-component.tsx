import { useEffect, useState } from "react";

type ScannerComponentProps = {
  variant?: 'wikipedia' | 'medium';
  className?: string;
};

export default function ScannerComponent({ variant = 'wikipedia', className = "" }: ScannerComponentProps) {
  const [scanProgress, setScanProgress] = useState<number>(0);

  // Simulation loop: 0 to 100%
  useEffect(() => {
    const interval = setInterval(() => {
      setScanProgress((prev) => (prev >= 100 ? 0 : prev + 1.5));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative bg-[#0c0c0e] overflow-hidden flex flex-col text-left ${className || "rounded-xl border border-white/10 shadow-2xl order-1 lg:order-2 h-[500px]"}`}>
      
      {/* Browser Chrome / Title Bar */}
      <div className="flex flex-col bg-[#18181b] border-b border-white/5 relative z-20">
        {/* Top row: Window controls and Tabs */}
        <div className="flex items-center px-4 pt-3 pb-2 space-x-4">
          <div className="flex space-x-2">
            <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-500/80"></div>
            <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
          </div>
          <div className="flex-1 flex text-xs text-zinc-400">
            <div className="bg-[#27272a] px-4 py-1.5 rounded-t-md border-t border-x border-white/10 flex items-center gap-2 shadow-sm">
              <span className={`w-3 h-3 text-[8px] font-bold flex items-center justify-center rounded-sm ${variant === 'wikipedia' ? 'bg-white text-black' : 'bg-black text-white border border-zinc-600'}`}>
                {variant === 'wikipedia' ? 'W' : 'M'}
              </span>
              {variant === 'wikipedia' ? 'Artificial intelligence - Wikipedia' : 'The Future of AI - Medium'}
            </div>
          </div>
        </div>
        
        {/* Address Bar Row */}
        <div className="flex items-center px-4 py-2 bg-[#27272a] gap-4">
          <div className="flex gap-3 text-zinc-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </div>
          <div className="flex-1 flex items-center bg-[#18181b] rounded-md px-3 py-1.5 text-xs text-zinc-300 border border-white/5 shadow-inner">
            <svg className="w-3 h-3 mr-2 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            {variant === 'wikipedia' ? 'en.wikipedia.org/wiki/Artificial_intelligence' : 'medium.com/@tech/the-future-of-ai'}
          </div>
        </div>
      </div>

      {/* Browser Viewport & Content */}
      <div className="relative flex-1 flex bg-[#ffffff] text-zinc-800 overflow-hidden">
        
        {variant === 'wikipedia' ? (
          <>
            {/* Sidebar */}
            <div className="w-32 lg:w-40 border-r border-zinc-200 p-4 hidden sm:block bg-[#f8f9fa]">
              <div className=" text-lg mb-6 font-semibold tracking-tight border-b border-zinc-300 pb-4 text-black">WIKIPEDIA</div>
              <ul className="text-xs space-y-3 text-[#0645ad]">
                <li className="cursor-pointer hover:underline">Main page</li>
                <li className="cursor-pointer hover:underline">Contents</li>
                <li className="cursor-pointer hover:underline">Current events</li>
                <li className="cursor-pointer hover:underline">Random article</li>
              </ul>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 lg:p-8 overflow-hidden relative">
              <h1 className="text-3xl border-b border-zinc-300 pb-2 mb-4 text-black font-serif">Artificial intelligence</h1>
              
              <div className="flex gap-6">
                <div className="flex-1 space-y-4 text-[13px] leading-relaxed text-[#202122] font-sans">
                  <p>
                    <b>Artificial intelligence</b> (<b>AI</b>), in its broadest sense, is intelligence exhibited by machines, particularly computer systems. It is a field of research in <span className="text-[#0645ad] hover:underline cursor-pointer">computer science</span> that develops and studies methods and software which enable machines to perceive their environment and uses learning and intelligence to take actions that maximize their chances of achieving defined goals.
                  </p>
                  <p>
                    Such machines may be called AIs. Some of the high-profile applications of AI include advanced web search engines (e.g., <span className="text-[#0645ad] hover:underline cursor-pointer">Google Search</span>), recommendation systems (used by YouTube, Amazon, and Netflix), understanding human speech (such as Siri and Alexa), self-driving cars (e.g., Waymo), and generative or creative tools (ChatGPT and AI art).
                  </p>
                  <h2 className="text-xl border-b border-zinc-300 pb-1 mt-6 mb-2 text-black">History</h2>
                  <p>
                    The field of AI research was born at a workshop at <span className="text-[#0645ad] hover:underline cursor-pointer">Dartmouth College</span> in 1956. The attendees became the founders and leaders of AI research. They and their students produced programs that the press described as "astonishing": computers were learning checkers strategies, solving word problems in algebra, proving logical theorems, and speaking English.
                  </p>
                </div>
                
                {/* Infobox placeholder */}
                <div className="hidden md:block w-48 border border-zinc-300 bg-[#f8f9fa] p-3 text-xs h-fit">
                  <div className="font-bold text-center mb-2 text-black">Artificial intelligence</div>
                  <div className="h-24 bg-zinc-200 mb-2 border border-zinc-300 flex items-center justify-center text-zinc-500">
                    Network Map Image
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-zinc-300 pt-2">
                    <div className="font-bold text-black col-span-1">Subclass of</div>
                    <div className="text-[#0645ad] col-span-2">Computer science</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Medium Variant */
          <div className="flex-1 overflow-hidden relative flex flex-col items-center">
            {/* Medium Header */}
            <div className="w-full px-6 lg:px-12 pt-6 pb-2 flex items-center justify-between font-sans">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">JS</div>
                    <div>
                        <div className="text-[13px] font-medium text-black">Jane Smith</div>
                        <div className="text-[11px] text-zinc-500">Jul 5 · 5 min read</div>
                    </div>
                </div>
                <div className="flex gap-2 text-zinc-400">
                    <svg className="w-4 h-4 cursor-pointer hover:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    <svg className="w-4 h-4 cursor-pointer hover:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </div>
            </div>
            
            {/* Medium Content */}
            <div className="w-full px-6 lg:px-12 pb-8 font-serif">
                <h1 className="text-2xl md:text-3xl font-bold text-black mb-4 leading-snug">The Future of AI: Beyond Generative Models</h1>
                
                <div className="text-[14px] md:text-[15px] text-zinc-700 leading-relaxed space-y-4">
                    <p>
                        We are standing at the precipice of a new era in computing. While large language models have dominated the headlines, the real revolution is happening in the subtle integrations of AI into our daily workflows.
                    </p>
                    <p>
                        The true power of these systems lies not in their ability to write poetry, but in their capacity to understand context, extract meaning, and connect disparate pieces of information effortlessly.
                    </p>
                    <div className="w-full h-32 bg-zinc-100 rounded my-6 flex items-center justify-center text-zinc-400 font-sans text-xs border border-zinc-200">
                        Neural network illustration
                    </div>
                    <p>
                        As we move towards autonomous agents, the focus shifts from prompting to orchestration. How do these models interact with existing tools? How do they handle long-term memory?
                    </p>
                </div>
            </div>
          </div>
        )}

        {/* Scanning Laser */}
        <div 
          className="absolute left-0 right-0 h-[2px] bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] transition-all duration-75 ease-linear z-10"
          style={{ top: `${scanProgress}%` }}
        >
          <div className="absolute bottom-full w-full h-16 bg-linear-to-t from-blue-500/20 to-transparent"></div>
        </div>

        {/* Dynamic Extraction Tooltip */}
        {scanProgress > 10 && scanProgress < 95 && (
          <div 
            className="absolute left-1/2 -translate-x-1/2 bg-[#0c0c0e]/95 backdrop-blur-md border border-white/10 px-4 py-3 rounded-lg text-xs font-mono transition-all duration-75 shadow-2xl z-20 flex flex-col gap-1.5 min-w-[260px]"
            style={{ top: `calc(${scanProgress}% + 15px)` }}
          >
            {scanProgress > 10 && scanProgress < 40 && (
              <>
                <span className="text-blue-400 font-semibold">Extracting Entity:</span>
                <span className="text-white truncate">Title: {variant === 'wikipedia' ? 'Artificial intelligence' : 'The Future of AI...'}</span>
              </>
            )}
            {scanProgress >= 40 && scanProgress < 70 && (
              <>
                <span className="text-purple-400 font-semibold">Summarizing Context:</span>
                <span className="text-white truncate">{variant === 'wikipedia' ? 'Definition & core concepts' : 'Meaning extraction'}</span>
                <span className="text-zinc-400 italic text-[10px] mt-1 border-l-2 border-purple-500/50 pl-2">"{variant === 'wikipedia' ? 'intelligence exhibited by machines...' : 'real revolution is happening...'}"</span>
              </>
            )}
            {scanProgress >= 70 && (
              <>
                <span className="text-green-400 font-semibold">Generating Tags:</span>
                <span className="text-white mt-1 flex gap-2">
                  <span className="bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">#AI</span>
                  <span className="bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">#Tech</span>
                  <span className="bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">#History</span>
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}