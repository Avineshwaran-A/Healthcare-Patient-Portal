"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

import { cn } from "@/lib/utils";

/**
 * Search/filter form that navigates client-side (no full page reload), shows
 * a pending state, and re-applies automatically when a <select> or date
 * changes. Still a real <form>, so it works without JavaScript.
 */
export function FilterForm({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function apply() {
    const sp = new URLSearchParams();
    new FormData(ref.current!).forEach((v, k) => {
      if (typeof v === "string" && v.trim()) sp.set(k, v.trim());
    });
    const q = sp.toString();
    startTransition(() => router.push(q ? `${pathname}?${q}` : pathname));
  }

  return (
    <form
      ref={ref}
      role="search"
      aria-busy={pending}
      className={cn("relative", pending && "[&_button[type=submit]]:opacity-70", className)}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      onChange={(e) => {
        const t = e.target as HTMLElement;
        if (t.tagName === "SELECT" || (t as HTMLInputElement).type === "date") apply();
      }}
    >
      {children}
      {pending && <span className="sr-only" aria-live="polite">Loading results</span>}
    </form>
  );
}
