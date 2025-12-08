// app/_components/NeuralHero.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function NeuralHero() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
      
      {/* Neural Network Background Visualization */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         {/* Central Core Glow */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse"></div>

         {/* Floating Nodes (Simulated) */}
         <Node x={20} y={30} delay={0} mouse={mousePos} />
         <Node x={80} y={20} delay={1} mouse={mousePos} />
         <Node x={15} y={70} delay={2} mouse={mousePos} />
         <Node x={85} y={65} delay={0.5} mouse={mousePos} />
         <Node x={50} y={15} delay={1.5} mouse={mousePos} />
         
         {/* Connecting Lines (SVG) */}
         <svg className="absolute inset-0 w-full h-full opacity-20">
            <line x1="50%" y1="50%" x2="20%" y2="30%" stroke="white" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="80%" y2="20%" stroke="white" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="15%" y2="70%" stroke="white" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="85%" y2="65%" stroke="white" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="50%" y2="15%" stroke="white" strokeWidth="1" />
         </svg>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <div className="animate-reveal inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-400 backdrop-blur-md mb-8">
           <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Neural Interface v3.0 Online
        </div>

        <h1 className="animate-reveal delay-100 text-6xl md:text-8xl font-bold tracking-tight text-white mb-6 leading-tight">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-white">External Brain</span> <br />
          for the Internet.
        </h1>

        <p className="animate-reveal delay-200 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
           Insightify connects your scattered bookmarks into a living knowledge graph.
           Powered by Gemini AI, it reads, understands, and organizes the web for you.
        </p>

        <div className="animate-reveal delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
           <Link 
              href="/register"
              className="group relative h-12 px-8 flex items-center justify-center rounded-full bg-white text-black font-semibold transition-transform hover:scale-105 active:scale-95"
           >
              Create Account
              <div className="absolute inset-0 -z-10 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
           </Link>
           <Link 
              href="/features"
              className="h-12 px-8 flex items-center justify-center rounded-full border border-white/20 text-white font-medium hover:bg-white/5 transition-colors"
           >
              Explore Capabilities
           </Link>
        </div>
      </div>
    </section>
  );
}

function Node({ x, y, delay, mouse }: { x: number, y: number, delay: number, mouse: { x: number, y: number } }) {
   return (
      <div 
         className="absolute h-12 w-12 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-center transition-transform duration-100 ease-out shadow-[0_0_15px_rgba(255,255,255,0.05)]"
         style={{ 
            left: `${x}%`, 
            top: `${y}%`,
            transform: `translate(${mouse.x * (delay + 1)}px, ${mouse.y * (delay + 1)}px)`
         }}
      >
         <div className="h-2 w-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: `${delay}s` }}></div>
      </div>
   )
}
