"use client";

import {
  Building2,
  Calendar,
  Clock,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Search,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

import type { NavIcon, NavItem } from "./nav-config";

const ICONS: Record<NavIcon, typeof LayoutDashboard> = {
  home: LayoutDashboard,
  search: Search,
  calendar: Calendar,
  file: FileText,
  wallet: Wallet,
  user: User,
  flask: FlaskConical,
  clock: Clock,
  stethoscope: Stethoscope,
  users: Users,
  building: Building2,
  shield: ShieldCheck,
};

export function isActive(pathname: string, href: string, root: string) {
  return href === root ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function NavLinks({ items, root, onNavigate }: { items: NavItem[]; root: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  // Highlight the clicked item immediately, before the server page arrives.
  const [optimistic, setOptimistic] = useState<string | null>(null);
  useEffect(() => setOptimistic(null), [pathname]);
  const current = optimistic ?? pathname;

  return (
    <nav aria-label="Main" className="space-y-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(current, item.href, root);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              setOptimistic(item.href);
              onNavigate?.();
            }}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-white/[0.08] text-white" : "text-sidebar-foreground hover:bg-white/[0.05] hover:text-white",
            )}
          >
            {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-sidebar-active" aria-hidden />}
            <Icon
              className={cn("h-[18px] w-[18px] shrink-0", active ? "text-sidebar-active" : "text-sidebar-foreground/80 group-hover:text-white")}
              aria-hidden
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PageTitle({ items, root }: { items: NavItem[]; root: string }) {
  const pathname = usePathname();
  const item = [...items].reverse().find((i) => isActive(pathname, i.href, root));
  return <span className="truncate text-sm font-semibold">{item?.label ?? ""}</span>;
}

export function MobileNav({ items, root, top, footer }: { items: NavItem[]; root: string; top: React.ReactNode; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </button>
      {/* Portal to <body>: the header uses backdrop-filter, which would make
          a position:fixed child size itself to the header instead of the viewport. */}
      {open &&
        createPortal(
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-sidebar px-3 py-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between px-2">
              {top}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks items={items} root={root} onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t border-white/10 pt-3">{footer}</div>
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
