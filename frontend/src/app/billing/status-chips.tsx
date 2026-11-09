import Link from "next/link";

import { chipClass, Input, STATUS } from "@/components/ui";

export function StatusChips({ basePath, current, values, q }: { basePath: string; current?: string; values: string[]; q?: string }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {[undefined, ...values].map((s) => {
        const params = new URLSearchParams();
        if (s) params.set("status", s);
        if (q) params.set("q", q);
        const query = params.toString();
        return (
          <Link key={s ?? "all"} href={`${basePath}${query ? `?${query}` : ""}`} className={chipClass(current === s)}>
            {s ? STATUS[s]?.label ?? s : "All"}
          </Link>
        );
      })}
    </div>
  );
}

export function SearchBox({ q, status, placeholder = "Name, email or PT-000012" }: { q?: string; status?: string; placeholder?: string }) {
  return (
    <>
      {status && <input type="hidden" name="status" value={status} />}
      <label htmlFor="q" className="sr-only">Search</label>
      <Input id="q" name="q" defaultValue={q} placeholder={placeholder} className="sm:max-w-xs" />
    </>
  );
}

export const pick = (v: string | undefined, allowed: string[]) => (v && allowed.includes(v) ? v : undefined);
