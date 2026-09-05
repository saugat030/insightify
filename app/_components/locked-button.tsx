import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";

// not `disabled` so the tooltip still fires on hover, and its onClick is a no-op.
export function LockedButton({
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