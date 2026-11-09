import Link from "next/link";

import { initials } from "@/lib/utils";
import type { Me } from "@/types/api";

import { Logo } from "../logo";
import { LogoutButton } from "./logout-button";
import { NAV, ROLE_LABEL } from "./nav-config";
import { MobileNav, NavLinks, PageTitle } from "./nav-links";
import { NotificationBell } from "./notification-bell";

function Avatar({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold ring-2 ring-primary/15 text-white ${className}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

function UserChip({ me }: { me: Me }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Avatar name={me.full_name} className="h-9 w-9 text-xs" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{me.full_name}</p>
        <p className="truncate text-xs text-sidebar-foreground">{me.email}</p>
      </div>
    </div>
  );
}

export function AppShell({ me, children }: { me: Me; children: React.ReactNode }) {
  const items = NAV[me.role];
  const root = `/${me.role}`;
  const footer = (
    <>
      <UserChip me={me} />
      <LogoutButton />
    </>
  );
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col bg-sidebar px-3 py-5 lg:flex">
        <div className="mb-7 flex items-center justify-between px-2">
          <Link href={root} className="rounded-lg">
            <Logo inverted />
          </Link>
        </div>
        <p className="mb-2 px-3 label-mono text-sidebar-foreground/60">
          {ROLE_LABEL[me.role]} workspace
        </p>
        <NavLinks items={items} root={root} />
        <div className="mt-auto border-t border-white/10 pt-3">{footer}</div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:px-6">
          <MobileNav items={items} root={root} top={<Logo inverted compact />} footer={footer} />
          <Link href={root} className="lg:hidden">
            <Logo compact />
          </Link>
          <div className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground lg:flex">
            <span>{ROLE_LABEL[me.role]}</span>
            <span aria-hidden>/</span>
            <span className="text-foreground">
              <PageTitle items={items} root={root} />
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <div className="hidden items-center gap-2.5 border-l pl-3 sm:flex">
              <Avatar name={me.full_name} className="h-8 w-8 text-[11px]" />
              <div className="hidden leading-tight md:block">
                <p className="text-sm font-medium">{me.full_name}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABEL[me.role]}</p>
              </div>
            </div>
          </div>
        </header>
        <main id="main" className="page-in mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
