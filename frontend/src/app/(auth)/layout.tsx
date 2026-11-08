import { CalendarCheck, FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/logo";

const POINTS = [
  { icon: CalendarCheck, text: "Book and manage appointments with real-time availability" },
  { icon: FileText, text: "Prescriptions, consultation notes and lab reports in one place" },
  { icon: ShieldCheck, text: "Role-based access and audit logging protect your records" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel (desktop only — not rendered on small screens). */}
      <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-sidebar-active/10 blur-3xl" aria-hidden />
        <Link href="/" className="relative">
          <Logo inverted />
        </Link>
        <div className="relative my-auto max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">Your care, connected.</h2>
          <p className="mt-3 text-sidebar-foreground">One secure portal for patients, doctors and hospital teams.</p>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sidebar-active">
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="pt-1.5 text-sm text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-sidebar-foreground/70">Demo environment · synthetic data only</p>
      </aside>

      <div className="flex min-h-screen flex-col items-center px-4 py-10 sm:justify-center">
        <Link href="/" className="mb-8 lg:hidden">
          <Logo />
        </Link>
        <main className="w-full max-w-md">{children}</main>
      </div>
    </div>
  );
}
