"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ECG_WIDE } from "@/components/motion/site-motion";
import { ClipReveal, MaskLines } from "@/components/motion/reveal";
import { TransitionLink } from "@/components/motion/transition-link";
import { Badge, buttonClass, StatusBadge } from "@/components/ui";
import { Logo } from "@/components/logo";
import { onSiteReady, prefersReducedMotion, registerGsap } from "@/lib/motion";
import { cn } from "@/lib/utils";

const TICKER = ["Book in minutes", "Prescriptions", "Lab reports", "Role-based access", "Audit trail", "Doctor schedules", "Invoices"];

/* ───────────────────────── mock UI (live HTML, synthetic data) ───────────────────────── */

function Window({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-black/10 bg-card text-foreground shadow-lift", className)}>
      <div className="flex items-center justify-between border-b bg-muted/60 px-4 py-2.5">
        <span className="eyebrow text-muted-foreground">{title}</span>
        <span className="flex gap-1.5" aria-hidden>
          <i className="h-2 w-2 rounded-full bg-border" />
          <i className="h-2 w-2 rounded-full bg-border" />
          <i className="h-2 w-2 rounded-full bg-border" />
        </span>
      </div>
      {children}
    </div>
  );
}

function PatientMock() {
  return (
    <Window title="Patient / Overview">
      <ul className="divide-y">
        {[
          ["Tue 14 Oct · 10:30", "Dr. Meera Iyer", "Cardiology", "confirmed"],
          ["Fri 17 Oct · 4:00", "Dr. Arun Nair", "General medicine", "scheduled"],
          ["Mon 29 Sep · 9:15", "Dr. Meera Iyer", "Cardiology", "completed"],
        ].map(([when, who, dept, status]) => (
          <li key={when} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{who}</p>
              <p className="tabular text-xs text-muted-foreground">
                {when} · {dept}
              </p>
            </div>
            <StatusBadge status={status} />
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t bg-muted/40 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Lipid panel</p>
          <p className="text-xs text-muted-foreground">Lab report · 29 Sep</p>
        </div>
        <Badge tone="success" variant="solid" dot>
          Normal
        </Badge>
      </div>
    </Window>
  );
}

function DoctorMock() {
  return (
    <Window title="Doctor / Today">
      <ul className="divide-y">
        {[
          ["9:00", "Ravi Menon", "Follow-up", "completed"],
          ["9:30", "Anita Das", "New visit", "confirmed"],
          ["10:15", "Karan Shah", "Lab review", "scheduled"],
        ].map(([t, name, kind, status]) => (
          <li key={t} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 px-4 py-3">
            <span className="tabular text-xs text-muted-foreground">{t}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{kind}</p>
            </div>
            <StatusBadge status={status} />
          </li>
        ))}
      </ul>
      <div className="space-y-2 border-t bg-muted/40 px-4 py-3">
        <p className="eyebrow text-muted-foreground">Prescription</p>
        <p className="tabular text-xs">Paracetamol 500 mg · 1 tablet · twice daily · 3 days</p>
        <span className={buttonClass("default", "sm", "pointer-events-none")}>Save prescription</span>
      </div>
    </Window>
  );
}

function AdminMock() {
  return (
    <Window title="Admin / Doctors">
      <table className="table-base">
        <thead>
          <tr>
            <th>Doctor</th>
            <th>Dept</th>
            <th className="text-right">State</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Dr. Leela Pillai", "Paediatrics", "requested"],
            ["Dr. Imran Qureshi", "Orthopaedics", "confirmed"],
          ].map(([n, d, s]) => (
            <tr key={n}>
              <td className="font-medium">{n}</td>
              <td className="text-muted-foreground">{d}</td>
              <td className="text-right">
                <StatusBadge status={s} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-1.5 border-t bg-muted/40 px-4 py-3 tabular text-[11px] text-muted-foreground">
        <p>
          <span className="text-foreground">10:42</span> doctor.view_history · dr.iyer → patient 0412
        </p>
        <p>
          <span className="text-foreground">10:41</span> invoice.mark_paid · admin
        </p>
      </div>
    </Window>
  );
}

const SLOTS = ["9:00", "9:30", "10:00", "10:30", "11:00", "11:30"];

function FlowPreview({ step }: { step: number }) {
  return (
    <Window title="Patient / Book" className="w-full">
      <div className="min-h-[19rem] p-5">
        {step === 0 && (
          <ul className="space-y-2" aria-label="Doctors">
            {[
              ["Dr. Meera Iyer", "Cardiology · 12 yrs", true],
              ["Dr. Arun Nair", "General medicine · 8 yrs", false],
              ["Dr. Leela Pillai", "Paediatrics · 15 yrs", false],
            ].map(([n, d, on]) => (
              <li key={String(n)} className={cn("flex items-center justify-between rounded-lg border px-4 py-3 transition-colors", on ? "border-primary bg-accent" : "bg-card")}>
                <div>
                  <p className="text-sm font-medium">{n}</p>
                  <p className="text-xs text-muted-foreground">{d}</p>
                </div>
                {on ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
              </li>
            ))}
          </ul>
        )}
        {step === 1 && (
          <div>
            <p className="mb-3 text-sm font-medium">Tuesday, 14 Oct</p>
            <div className="grid grid-cols-3 gap-2">
              {SLOTS.map((t, i) => (
                <span
                  key={t}
                  className={cn(
                    "tabular rounded-lg border px-3 py-2.5 text-center tabular text-xs",
                    i === 3 && "border-primary bg-primary text-primary-foreground",
                    i === 1 && "border-dashed text-muted-foreground line-through",
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Taken slots are struck through. Two requests for one slot: the database lets only one through.</p>
          </div>
        )}
        {step === 2 && (
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold">Tuesday 14 Oct, 10:30</p>
                <p className="mt-1 text-sm text-muted-foreground">Dr. Meera Iyer · Cardiology</p>
              </div>
              <StatusBadge status="confirmed" />
            </div>
            <p className="rounded-lg bg-muted px-4 py-3 text-sm">A reminder lands in your notifications the day before.</p>
          </div>
        )}
      </div>
    </Window>
  );
}

/* ───────────────────────── page ───────────────────────── */

const ROLE_POINTS = {
  patient: ["See real availability and book a slot in a few taps.", "Prescriptions, notes and lab reports in one timeline.", "Invoices and payment status, no phone calls."],
  doctor: ["A day view built around today's patients.", "Write prescriptions and request labs during the consultation.", "History opens only while you are treating the patient."],
  admin: ["Approve doctors, set fees and weekly schedules.", "Departments, users and billing in one place.", "An audit log of who viewed what, and when."],
};

function Points({ items, tone }: { items: string[]; tone: "light" | "dark" }) {
  return (
    <ul className={cn("mt-8 max-w-md space-y-3 text-base", tone === "light" ? "text-white/80" : "text-foreground/80")}>
      {items.map((t) => (
        <li key={t} className="flex gap-3">
          <Check className={cn("mt-1 h-4 w-4 shrink-0", tone === "light" ? "text-mint" : "text-primary")} aria-hidden />
          {t}
        </li>
      ))}
    </ul>
  );
}

function Panel({ className, children, label, ...rest }: React.HTMLAttributes<HTMLElement> & { label?: string }) {
  return (
    <section data-panel aria-label={label} className={cn("relative flex min-h-[100svh] flex-col justify-center overflow-hidden", className)} {...rest}>
      <div data-inner className="origin-top">
        {children}
      </div>
      <div data-dim className="pointer-events-none absolute inset-0 bg-black opacity-0" aria-hidden />
    </section>
  );
}

const STATEMENT =
  "Your record is yours. Doctors see it only while they are treating you, and every view is written to an audit log.".split(" ");

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const g = registerGsap();
    const mm = gsap.matchMedia();

    // ECG line under the hero draws after the loader.
    const ecg = el.querySelector<SVGPathElement>("[data-hero-ecg]");
    if (prefersReducedMotion()) g.set("[data-hero-fade]", { autoAlpha: 1 });
    const stopReady = prefersReducedMotion()
      ? () => {}
      : onSiteReady(() => {
          if (ecg) g.fromTo(ecg, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.6, ease: "power2.inOut", delay: 0.4 });
          g.fromTo("[data-hero-fade]", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.12, delay: 0.7 });
        });

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const panels = g.utils.toArray<HTMLElement>("[data-panel]", el);

      panels.forEach((p, i) => {
        const next = panels[i + 1];
        const inner = p.querySelector<HTMLElement>("[data-inner]");
        const dim = p.querySelector<HTMLElement>("[data-dim]");

        // Entering panel: uncovered from a rounded inset as it slides over the previous one.
        if (i > 0) {
          g.fromTo(
            p,
            { clipPath: "inset(7% 4% 0% 4% round 2.5rem 2.5rem 0rem 0rem)" },
            {
              clipPath: "inset(0% 0% 0% 0% round 0rem 0rem 0rem 0rem)",
              ease: "none",
              scrollTrigger: { trigger: p, start: "top bottom", end: "top 15%", scrub: true },
            },
          );
        }

        // Panel being covered: pins in place, recedes and dims.
        if (next && !p.hasAttribute("data-nopin")) {
          ScrollTrigger.create({
            trigger: p,
            start: () => (p.offsetHeight > window.innerHeight ? "bottom bottom" : "top top"),
            endTrigger: next,
            end: "top top",
            pin: true,
            pinSpacing: false,
            invalidateOnRefresh: true,
          });
          const st = { trigger: next, start: "top bottom", end: "top top", scrub: true };
          if (inner) g.to(inner, { scale: 0.94, ease: "none", scrollTrigger: st });
          if (dim) g.to(dim, { opacity: 0.45, ease: "none", scrollTrigger: st });
        }
      });

      // Highlight statement: words light up with scroll progress, inside their own section.
      const words = g.utils.toArray<HTMLElement>("[data-word]", el);
      g.fromTo(
        words,
        { opacity: 0.18 },
        { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: "[data-statement]", start: "top 72%", end: "bottom 55%", scrub: true } },
      );
    });

    // Booking flow: a sticky scene whose step follows scroll progress (desktop only).
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const flow = el.querySelector<HTMLElement>("[data-flow]");
      if (!flow) return;
      const st = ScrollTrigger.create({
        trigger: flow,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => setStep(Math.min(2, Math.floor(self.progress * 3))),
      });
      return () => st.kill();
    });
    mm.add("(max-width: 767px), (prefers-reduced-motion: reduce)", () => setStep(2));

    return () => {
      stopReady();
      mm.revert();
    };
  }, []);

  const flowSteps = [
    ["Choose a doctor", "Browse by department. Fees and experience are shown up front."],
    ["Pick a slot", "Only free times appear. Two people cannot hold the same one."],
    ["Confirm", "You get the booking, the doctor's note field and a reminder."],
  ];

  return (
    <div ref={root}>
      {/* Floating nav */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-4 py-4 sm:px-8">
        <TransitionLink href="/" className="pointer-events-auto rounded-full bg-card/90 py-1.5 pl-1.5 pr-4 shadow-card backdrop-blur" aria-label="Healthcareportal home">
          <Logo compact />
        </TransitionLink>
        <nav className="pointer-events-auto flex items-center gap-2 rounded-full border border-black/10 bg-card/90 p-1 shadow-card backdrop-blur" aria-label="Account">
          <TransitionLink href="/login" className={buttonClass("ghost", "sm", "rounded-full")}>
            Sign in
          </TransitionLink>
          <TransitionLink href="/register" className={buttonClass("action", "sm")}>
            Register
          </TransitionLink>
        </nav>
      </header>

      <main>
        {/* 1 · HERO */}
        <Panel label="Introduction" className="bg-background pb-0 pt-24">
          <div className="mx-auto grid w-full max-w-[88rem] gap-10 px-5 sm:px-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.75fr)] lg:items-end">
            <div>
              <MaskLines
                as="h1"
                mode="load"
                delay={0.45}
                className="display-xl text-foreground"
                lines={[
                  { text: "Care, booked," },
                  { text: "read, and", className: "pl-[6vw]" },
                  { text: <span className="text-primary">remembered.</span>, className: "pl-[1.5vw]" },
                ]}
              />
              <div data-hero-fade className="mt-8 flex max-w-xl flex-col gap-6 opacity-0 sm:mt-10 lg:ml-[6vw]">
                <p className="text-lg leading-relaxed text-muted-foreground">
                  One portal for patients, doctors and hospital administrators. Appointments, prescriptions and lab reports, kept in a single record.
                </p>
                <div className="flex flex-wrap gap-3">
                  <TransitionLink href="/register" className={buttonClass("action", "default", "h-12 px-7 text-[15px]")}>
                    Create patient account <ArrowRight className="h-4 w-4" aria-hidden />
                  </TransitionLink>
                  <TransitionLink href="/login" className={buttonClass("outline", "default", "h-12 px-7 text-[15px]")}>
                    Sign in
                  </TransitionLink>
                </div>
              </div>
            </div>
            <div data-hero-fade className="hidden opacity-0 lg:block">
              <Window title="Next appointment">
                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-2xl font-semibold leading-none">Tue 14 Oct</p>
                      <p className="tabular mt-1 tabular text-sm text-muted-foreground">10:30 am</p>
                    </div>
                    <StatusBadge status="confirmed" />
                  </div>
                  <p className="text-sm">
                    Dr. Meera Iyer <span className="text-muted-foreground">· Cardiology</span>
                  </p>
                </div>
              </Window>
            </div>
          </div>

          <div className="mt-10 sm:mt-14">
            <svg viewBox="0 0 1200 60" preserveAspectRatio="xMidYMid slice" className="h-14 w-full text-primary sm:h-20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path data-hero-ecg d={ECG_WIDE} pathLength={1} strokeDasharray={1} strokeDashoffset={0} />
            </svg>
            <div className="ticker overflow-hidden border-t border-foreground/10 bg-foreground py-4 text-background" aria-hidden>
              <div className="ticker-track flex w-max whitespace-nowrap">
                {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
                  <span key={i} className="eyebrow flex items-center px-6 text-[12px]">
                    {t}
                    <span className="ml-12 h-1 w-1 rounded-full bg-coral" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {/* 2 · PATIENTS */}
        <Panel label="For patients" className="bg-sidebar text-white">
          <div className="mx-auto grid w-full max-w-[88rem] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2">
            <div>
              <MaskLines
                className="display-lg"
                lines={[{ text: "For" }, { text: <span className="text-mint">patients,</span>, className: "pl-[5vw]" }, { text: "calm by default.", className: "pl-[1vw]" }]}
              />
              <Points items={ROLE_POINTS.patient} tone="light" />
            </div>
            <ClipReveal>
              <PatientMock />
            </ClipReveal>
          </div>
        </Panel>

        {/* 3 · DOCTORS */}
        <Panel label="For doctors" className="bg-secondary text-foreground">
          <div className="mx-auto grid w-full max-w-[88rem] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2">
            <ClipReveal className="order-2 lg:order-1">
              <DoctorMock />
            </ClipReveal>
            <div className="order-1 lg:order-2 lg:pl-[4vw]">
              <MaskLines
                className="display-lg"
                lines={[{ text: "For" }, { text: <span className="text-primary">doctors,</span>, className: "pl-[5vw]" }, { text: "the day in view.", className: "pl-[1vw]" }]}
              />
              <Points items={ROLE_POINTS.doctor} tone="dark" />
            </div>
          </div>
        </Panel>

        {/* 4 · ADMINS */}
        <Panel label="For administrators" className="bg-primary text-primary-foreground">
          <div className="mx-auto grid w-full max-w-[88rem] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2">
            <div>
              <MaskLines
                className="display-lg"
                lines={[{ text: "For" }, { text: <span className="text-mint">administrators,</span>, className: "pl-[5vw]" }, { text: "nothing hidden.", className: "pl-[1vw]" }]}
              />
              <Points items={ROLE_POINTS.admin} tone="light" />
            </div>
            <ClipReveal>
              <AdminMock />
            </ClipReveal>
          </div>
        </Panel>

        {/* 5 · BOOKING FLOW (sticky scene; step follows scroll on desktop) */}
        <section data-panel data-nopin data-flow aria-label="How booking works" className="relative bg-background md:h-[300svh]">
          <div className="md:sticky md:top-0 md:flex md:h-[100svh] md:items-center">
            <div className="mx-auto grid w-full max-w-[88rem] gap-12 px-5 py-20 sm:px-8 md:grid-cols-[1fr_1fr] md:items-center md:py-0">
              <div>
                <MaskLines
                  className="display-lg"
                  lines={[{ text: "Three steps" }, { text: <span className="text-primary">to booked.</span>, className: "pl-[4vw]" }]}
                />
                <ol className="mt-10 max-w-md space-y-6">
                  {flowSteps.map(([title, text], i) => (
                    <li key={title} className={cn("transition-opacity duration-500 ease-out-expo", step === i ? "opacity-100" : "opacity-40")} aria-current={step === i ? "step" : undefined}>
                      <h3 className="text-xl font-semibold">{title}</h3>
                      <p className="mt-1 text-muted-foreground">{text}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <FlowPreview step={step} />
            </div>
          </div>
        </section>

        {/* 6 · PRIVACY STATEMENT (word highlight moment) */}
        <Panel label="Privacy" className="bg-sidebar text-white">
          <div data-statement className="mx-auto w-full max-w-[88rem] px-5 py-24 sm:px-8">
            <p className="display-md max-w-5xl !text-[clamp(2rem,5vw,4.25rem)] !leading-[1.08]">
              {STATEMENT.map((w, i) => (
                <span key={i} data-word className={cn(w.startsWith("audit") || w.startsWith("record") ? "text-mint" : "")}>
                  {w}{" "}
                </span>
              ))}
            </p>
            <dl className="mt-16 grid max-w-4xl gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
              {[
                ["Access", "Roles are enforced in the API, never only in the browser."],
                ["Relationship", "A doctor opens a history only with a live appointment."],
                ["Trail", "Each record view is logged with who, what and when."],
              ].map(([k, v]) => (
                <div key={k} className="bg-sidebar p-5">
                  <dt className="eyebrow text-mint">{k}</dt>
                  <dd className="mt-2 text-sm text-white/75">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Panel>

        {/* 7 · CLOSE */}
        <Panel label="Get started" className="bg-secondary">
          <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-10 px-5 py-20 sm:px-8">
            <MaskLines
              className="display-xl"
              lines={[{ text: "Ready when" }, { text: <span className="text-primary">you are.</span>, className: "pl-[8vw]" }]}
            />
            <div className="flex flex-wrap gap-3 lg:pl-[8vw]">
              <TransitionLink href="/register" className={buttonClass("action", "default", "h-12 px-7 text-[15px]")}>
                Create patient account <ArrowRight className="h-4 w-4" aria-hidden />
              </TransitionLink>
              <TransitionLink href="/login" className={buttonClass("outline", "default", "h-12 px-7 text-[15px]")}>
                Sign in
              </TransitionLink>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground lg:ml-[8vw]">
              Demo environment with synthetic data only. This portal does not provide diagnosis or treatment advice. Doctors can{" "}
              <TransitionLink href="/register/doctor" className="link-draw text-foreground">
                apply for an account
              </TransitionLink>
              .
            </p>
          </div>
        </Panel>
      </main>
    </div>
  );
}
