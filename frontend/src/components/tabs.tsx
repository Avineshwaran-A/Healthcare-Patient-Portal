import Link from "next/link";

import { cn } from "@/lib/utils";

/** URL-driven segmented tabs (server-rendered, no client state). */
export function Tabs({
  basePath,
  current,
  tabs,
  param = "tab",
}: {
  basePath: string;
  current: string;
  tabs: { value: string; label: string }[];
  param?: string;
}) {
  return (
    <div className="mb-4 max-w-full overflow-x-auto">
      <div className="inline-flex gap-1 rounded-xl border bg-muted/60 p-1" role="tablist">
        {tabs.map((t) => {
          const active = current === t.value;
          return (
            <Link
              key={t.value}
              href={`${basePath}?${param}=${t.value}`}
              role="tab"
              aria-selected={active}
              scroll={false}
              className={cn(
                "whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
