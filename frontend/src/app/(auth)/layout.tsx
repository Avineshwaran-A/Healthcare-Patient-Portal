import Link from "next/link";

import { Logo } from "@/components/logo";
import { MaskLines } from "@/components/motion/reveal";
import { SiteMotion } from "@/components/motion/site-motion";

const POINTS = [
  "Book and manage appointments with live availability",
  "Prescriptions, notes and lab reports in one record",
  "Role-based access and an audit trail on every view",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <SiteMotion />
      {/* Brand panel (desktop only). */}
      <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-white lg:flex lg:flex-col">
        <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="absolute inset-x-0 bottom-24 h-40 w-full text-mint/20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M0 30 H38 L46 30 L52 8 L60 52 L68 18 L74 30 H112 L118 30 L124 22 L130 30 H200" vectorEffect="non-scaling-stroke" />
        </svg>
        <Link href="/" className="relative w-fit">
          <Logo inverted />
        </Link>
        <div className="relative my-auto max-w-md">
          <MaskLines
            as="h2"
            mode="load"
            delay={0.5}
            className="display-lg !text-[clamp(2.5rem,4.4vw,4rem)] !font-light"
            lines={[{ text: "Your care," }, { text: <span className="em-serif text-mint">connected.</span>, className: "pl-[2.5vw]" }]}
          />
          <ul className="mt-10 space-y-4">
            {POINTS.map((t) => (
              <li key={t} className="flex items-start gap-3 text-sm text-white/80">
                <span className="mt-2 h-px w-5 shrink-0 bg-mint" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="label-mono relative text-sidebar-foreground/70">Demo environment · synthetic data only</p>
      </aside>

      <div className="flex min-h-screen flex-col items-center px-4 py-10 sm:justify-center">
        <Link href="/" className="mb-8 lg:hidden">
          <Logo />
        </Link>
        <main className="page-in w-full max-w-md">{children}</main>
      </div>
    </div>
  );
}
