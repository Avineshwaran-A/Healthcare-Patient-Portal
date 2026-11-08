"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { cn, fmtDateTime } from "@/lib/utils";
import type { Notification } from "@/types/api";

type Data = { items: Notification[]; unread: number };

/** Fetched on mount, on navigation and when opened — no background polling. */
export function NotificationBell() {
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const load = useCallback(() => {
    api<Data>("/notifications").then(setData).catch(() => {});
  }, []);

  useEffect(load, [load, pathname]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const markAll = async () => {
    await api("/notifications/read-all", { method: "POST" });
    load();
  };

  const unread = data?.unread ?? 0;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white ring-2 ring-card">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="toast-in absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs font-medium text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {!data?.items.length && <li className="px-3 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</li>}
            {data?.items.map((n) => {
              const body = (
                <>
                  <div className="flex items-start gap-2">
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    <div className={cn(!n.is_read ? "" : "pl-4")}>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{fmtDateTime(n.created_at)}</p>
                    </div>
                  </div>
                </>
              );
              const onClick = () => {
                setOpen(false);
                if (!n.is_read) api(`/notifications/${n.id}/read`, { method: "POST" }).then(load).catch(() => {});
              };
              return (
                <li key={n.id} className="border-b last:border-0">
                  {n.link ? (
                    <Link href={n.link} onClick={onClick} className="block px-3 py-2.5 hover:bg-muted">
                      {body}
                    </Link>
                  ) : (
                    <button onClick={onClick} className="block w-full px-3 py-2.5 text-left hover:bg-muted">
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
