"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

import { curtainNavigate } from "@/lib/motion";

/** A Next link that covers the page with the pine curtain before navigating. Modified clicks behave normally. */
export function TransitionLink({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (props.target === "_blank") return;
        e.preventDefault();
        curtainNavigate((h) => router.push(h), typeof href === "string" ? href : String(href));
      }}
      {...props}
    />
  );
}
