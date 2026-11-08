import { HeartPulse } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ compact = false, inverted = false }: { compact?: boolean; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", inverted ? "text-white" : "text-foreground")}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm ring-1 ring-white/10">
        <HeartPulse className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className={compact ? "text-sm" : "text-[15px]"}>
        Care<span className={inverted ? "text-sidebar-active" : "text-primary"}>Portal</span>
      </span>
    </span>
  );
}
