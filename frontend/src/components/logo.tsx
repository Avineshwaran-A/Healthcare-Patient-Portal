import { cn } from "@/lib/utils";

/** Mark: a pulse line inside a rounded square. Wordmark: serif "Care" + italic "portal". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-mint", className)} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h4l2.5-6 4 12 2.5-6H22" />
      </svg>
    </span>
  );
}

export function Logo({ compact = false, inverted = false }: { compact?: boolean; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", inverted ? "text-white" : "text-foreground")}>
      <LogoMark className={inverted ? "bg-mint text-sidebar" : undefined} />
      <span className={cn("font-display font-normal tracking-tight", compact ? "text-lg" : "text-xl")}>
        Care<span className={cn("em-serif", inverted ? "text-mint" : "text-primary")}>portal</span>
      </span>
    </span>
  );
}
