"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { markReady, prefersReducedMotion, registerGsap } from "@/lib/motion";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** A heartbeat repeated across a 1200-unit line: used as a wide divider. */
export const ECG_WIDE = Array.from({ length: 6 }, (_, i) => `M${i * 200} 30 H${i * 200 + 38} L${i * 200 + 46} 30 L${i * 200 + 52} 8 L${i * 200 + 60} 52 L${i * 200 + 68} 18 L${i * 200 + 74} 30 H${i * 200 + 112} L${i * 200 + 118} 30 L${i * 200 + 124} 22 L${i * 200 + 130} 30 H${i * 200 + 200}`).join(" ");

export const ECG_PATH = "M0 30 H38 L46 30 L52 8 L60 52 L68 18 L74 30 H112 L118 30 L124 22 L130 30 H200";

/**
 * Mounted on landing and auth pages. Owns three things:
 *  1. the first-visit loader (landing only, `withLoader`) (ECG line draws, counter runs, panels split open),
 *  2. smooth inertial scrolling (Lenis, wired to ScrollTrigger),
 *  3. the pine page curtain used between landing and auth pages.
 * Workspace routes never mount this, so the app stays light.
 */
export function SiteMotion({ withLoader = false }: { withLoader?: boolean }) {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);

  // Loader + smooth scroll: once per mount.
  useEffect(() => {
    const g = registerGsap();
    const html = document.documentElement;
    const loader = root.current?.querySelector<HTMLElement>("[data-loader]");
    const reduced = prefersReducedMotion();

    let lenis: Lenis | null = null;
    let tick: ((t: number) => void) | null = null;
    if (!reduced) {
      lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
      lenis.on("scroll", ScrollTrigger.update);
      tick = (t) => lenis!.raf(t * 1000);
      g.ticker.add(tick);
      g.ticker.lagSmoothing(0);
    }

    const finish = () => {
      try {
        sessionStorage.setItem("cp-loaded", "1");
      } catch {
        /* ignore */
      }
      html.dataset.loaded = "1";
      html.style.overflow = "";
      lenis?.start();
      markReady();
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };

    let tl: gsap.core.Timeline | null = null;
    if (!loader || html.dataset.loaded || reduced) {
      if (loader) loader.style.display = "none";
      markReady();
    } else {
      html.style.overflow = "hidden";
      lenis?.stop();
      const path = loader.querySelector<SVGPathElement>("[data-ecg]");
      const count = loader.querySelector<HTMLElement>("[data-count]");
      const mark = loader.querySelector<HTMLElement>("[data-loader-mark]");
      const top = loader.querySelector<HTMLElement>("[data-panel-top]");
      const bottom = loader.querySelector<HTMLElement>("[data-panel-bottom]");
      const o = { v: 0 };
      tl = g.timeline({
        onComplete: () => {
          loader.style.display = "none";
          finish();
        },
      });
      tl.set(path, { strokeDashoffset: 1 })
        .to(path, { strokeDashoffset: 0, duration: 1.15, ease: "power2.inOut" }, 0)
        .to(o, { v: 100, duration: 1.15, ease: "power2.inOut", onUpdate: () => { if (count) count.textContent = String(Math.round(o.v)).padStart(3, "0"); } }, 0)
        .fromTo(mark, { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: "expo.out" }, 0.35)
        .to(mark, { yPercent: -110, duration: 0.5, ease: "expo.in" }, 1.35)
        .to(loader.querySelector("[data-loader-content]"), { autoAlpha: 0, duration: 0.25 }, 1.45)
        .to(top, { yPercent: -100, duration: 0.8, ease: "expo.inOut" }, 1.55)
        .to(bottom, { yPercent: 100, duration: 0.8, ease: "expo.inOut" }, 1.55)
        .set(loader, { autoAlpha: 0 });
    }

    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      tl?.kill();
      if (tick) g.ticker.remove(tick);
      lenis?.destroy();
      html.style.overflow = "";
    };
  }, []);

  // Curtain: open it on arrival when a TransitionLink closed it, on every route change.
  useEffect(() => {
    const el = root.current?.querySelector<HTMLElement>("[data-curtain]");
    if (!el) return;
    let flagged = false;
    try {
      flagged = sessionStorage.getItem("cp-curtain") === "1";
      sessionStorage.removeItem("cp-curtain");
    } catch {
      /* ignore */
    }
    if (!flagged) return;
    const g = registerGsap();
    g.fromTo(
      el,
      { clipPath: "inset(0% 0% 0% 0%)", autoAlpha: 1 },
      { clipPath: "inset(0% 0% 100% 0%)", duration: 0.9, ease: "expo.inOut", delay: 0.1, onComplete: () => { g.set(el, { pointerEvents: "none", autoAlpha: 0 }); } },
    );
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div ref={root}>
      {withLoader && (
      <div data-loader aria-hidden className="fixed inset-0 z-[100] text-sidebar-foreground">
        <div data-panel-top className="absolute inset-x-0 top-0 h-1/2 bg-sidebar" />
        <div data-panel-bottom className="absolute inset-x-0 bottom-0 h-1/2 bg-sidebar" />
        <div data-loader-content className="absolute inset-0 flex flex-col items-center justify-center gap-8">
          <svg viewBox="0 0 200 60" className="h-16 w-64 sm:w-80" fill="none" stroke="hsl(var(--mint))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path data-ecg d={ECG_PATH} pathLength={1} strokeDasharray={1} strokeDashoffset={0} />
          </svg>
          <div className="overflow-hidden pb-1">
            <p data-loader-mark className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Healthcare<span className="text-mint">portal</span>
            </p>
          </div>
        </div>
        <p data-count className="eyebrow absolute bottom-6 right-6 tabular text-sidebar-foreground/70 sm:bottom-8 sm:right-10">
          000
        </p>
      </div>
      )}
      <div data-curtain aria-hidden className="pointer-events-none fixed inset-0 z-[90] bg-primary opacity-0" style={{ clipPath: "inset(100% 0% 0% 0%)" }} />
    </div>
  );
}
