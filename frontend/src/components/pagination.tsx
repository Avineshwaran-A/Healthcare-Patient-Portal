import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonClass } from "./ui";

/** Link-based pagination: works without client JS and keeps URLs shareable. */
export function Pagination({
  page,
  size,
  total,
  basePath,
  params = {},
}: {
  page: number;
  size: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `${basePath}?${sp}`;
  };
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        Page {page} of {pages} · {total} total
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={buttonClass("outline", "sm")} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" /> Prev
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)} className={buttonClass("outline", "sm")} aria-label="Next page">
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
