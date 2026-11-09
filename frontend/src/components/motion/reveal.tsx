"use client";

import { type ElementType, type ReactNode, useEffect, useRef } from "react";

import { onSiteReady, prefersReducedMotion, registerGsap } from "@/lib/motion";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Mode = "load" | "scroll";

/** Run `play` on load (after the loader) or when `el` scrolls into view. Returns a cleanup. */
function trigger(el: Element, mode: Mode, play: () => void, start = "top 88%") {
  if (mode === "load") return onSiteReady(play);
  const st = ScrollTrigger.create({ trigger: el, start, once: true, onEnter: play });
  return () => st.kill();
}

export interface MaskLine {
  text: ReactNode;
  /** Extra classes per line: this is where word placement (indents, italics, colour) lives. */
  className?: string;
}

/**
 * Text masking effect. Every line sits in an overflow-hidden mask and rises into place.
 * Lines are authored explicitly so each one can be indented or restyled.
 */
export function MaskLines({
  lines,
  as = "h2",
  mode = "scroll",
  className,
  delay = 0,
  id,
}: {
  lines: MaskLine[];
  as?: ElementType;
  mode?: Mode;
  className?: string;
  delay?: number;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const Tag = as;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.setAttribute("data-in", "");
      return;
    }
    const g = registerGsap();
    const spans = el.querySelectorAll(".mask-line > span");
    return trigger(el, mode, () => {
      el.style.visibility = "visible";
      g.fromTo(
        spans,
        { yPercent: 110 },
        { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.1, delay, onComplete: () => el.setAttribute("data-in", "") },
      );
    });
  }, [mode, delay]);

  return (
    <Tag ref={ref} id={id} data-mask className={className}>
      {lines.map((l, i) => (
        <span key={i} className={`mask-line ${l.className ?? ""}`}>
          <span>{l.text}</span>
        </span>
      ))}
    </Tag>
  );
}

/** Image/UI mask: the block is uncovered from top to bottom as it enters the screen. */
export function ClipReveal({
  children,
  className,
  mode = "scroll",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  mode?: Mode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.setAttribute("data-in", "");
      return;
    }
    const g = registerGsap();
    return trigger(el, mode, () => {
      g.fromTo(
        el,
        { clipPath: "inset(0% 0% 100% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "expo.out", delay, onComplete: () => el.setAttribute("data-in", "") },
      );
    });
  }, [mode, delay]);

  return (
    <div ref={ref} data-clip className={className}>
      {children}
    </div>
  );
}
