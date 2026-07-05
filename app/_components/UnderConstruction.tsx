import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

type UnderConstructionProps = {
  title: ReactNode;
  description: ReactNode;
  linkHref?: string;
  linkText?: string;
  children?: ReactNode;
};

export default function UnderConstruction({
  title,
  description,
  linkHref,
  linkText,
  children
}: UnderConstructionProps) {
  return (
    <div className="relative w-full bg-background text-foreground selection:bg-white/20 font-outfit overflow-hidden min-h-[80vh] flex flex-col items-center justify-center">
      <main className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        {/* Under Construction Visual Container */}
        <div className="relative w-full max-w-lg mx-auto mb-16 group">
          <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-[100px] opacity-70 group-hover:opacity-100 transition-opacity" />
          <div className="relative aspect-square w-[350px] md:w-[450px] mx-auto scale-105">
            <Image
              src="/assets/under-construction.png" 
              alt="Under construction visual"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white font-oswald leading-tight">
            {title}
          </h1> 
          <p className="text-md md:text-lg text-zinc-400 leading-relaxed max-w-lg mx-auto">
            {description}
          </p>
          
          <div className="pt-4 flex justify-center gap-4">
            {children ? (
              children
            ) : linkHref && linkText ? (
              <Link 
                href={linkHref} 
                className="text-sm font-medium text-zinc-500 hover:text-white border-b border-zinc-800 hover:border-white transition-colors pb-1"
              >
                {linkText}
              </Link>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
