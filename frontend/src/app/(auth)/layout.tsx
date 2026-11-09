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
    <>
      {/* Kept outside the grid: it renders an overlay wrapper that must not take a grid cell. */}
      <SiteMotion />
      <div className="min-h-screen lg:grid lg:grid-cols-2">
        {/* Brand panel (desktop only), pinned to the viewport height. */}
        <aside className="relative hidden overflow-hidden bg-sidebar px-10 py-10 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col xl:px-14">
          <Link href="/" className="relative w-fit">
            <Logo inverted />
          </Link>
          <div className="relative my-auto max-w-md">
            <MaskLines
              as="h2"
              mode="load"
              delay={0.5}
              className="display-lg !text-[clamp(2rem,3.2vw,2.75rem)]"
              lines={[{ text: "Your care," }, { text: <span className="text-mint">connected.</span> }]}
            />
            <ul className="mt-8 space-y-4">
              {POINTS.map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm leading-relaxed text-white/80">
                  <span className="mt-2.5 h-px w-5 shrink-0 bg-mint" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <svg
            viewBox="0 0 200 60"
            preserveAspectRatio="none"
            className="pointer-events-none relative -mx-10 mb-6 h-16 w-[calc(100%+5rem)] text-mint/25 xl:-mx-14 xl:w-[calc(100%+7rem)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <path d="M0 30 H38 L46 30 L52 8 L60 52 L68 18 L74 30 H112 L118 30 L124 22 L130 30 H200" vectorEffect="non-scaling-stroke" />
          </svg>
          <p className="eyebrow relative text-sidebar-foreground/70">Demo environment · synthetic data only</p>
        </aside>

        <div className="flex min-h-screen flex-col items-center px-4 py-10 sm:justify-center sm:px-8">
          <Link href="/" className="mb-8 lg:hidden">
            <Logo />
          </Link>
          <main className="page-in w-full max-w-md">{children}</main>
        </div>
      </div>
    </>
  );
}
