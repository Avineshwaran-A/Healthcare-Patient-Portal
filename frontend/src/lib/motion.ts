"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/** Register GSAP plugins once (client only) and return gsap. */
export function registerGsap() {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return gsap;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Run `cb` once the loader has finished (or immediately when it is not shown). */
export function onSiteReady(cb: () => void): () => void {
  if (document.documentElement.dataset.ready) {
    cb();
    return () => {};
  }
  const h = () => cb();
  window.addEventListener("cp:ready", h, { once: true });
  return () => window.removeEventListener("cp:ready", h);
}

export function markReady() {
  document.documentElement.dataset.ready = "1";
  window.dispatchEvent(new Event("cp:ready"));
}

/** Wipe the curtain up over the page, then navigate. The next page opens it again. */
export function curtainNavigate(push: (href: string) => void, href: string) {
  const el = document.querySelector<HTMLElement>("[data-curtain]");
  if (!el || prefersReducedMotion()) {
    push(href);
    return;
  }
  try {
    sessionStorage.setItem("cp-curtain", "1");
  } catch {
    /* storage blocked: the page just opens without the reveal */
  }
  gsap.killTweensOf(el);
  gsap.set(el, { pointerEvents: "auto", autoAlpha: 1 });
  gsap.fromTo(
    el,
    { clipPath: "inset(100% 0% 0% 0%)" },
    { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "expo.inOut", onComplete: () => push(href) },
  );
}
