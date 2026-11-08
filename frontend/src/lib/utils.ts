import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// API datetimes are hospital wall-clock times without an offset. Parsing an
// offset-less ISO string as local and formatting as local keeps the same
// wall-clock value on server and client.
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

const parse = (s: string) => new Date(s.length === 10 ? `${s}T00:00:00` : s);

export const fmtDate = (s: string | null | undefined) => (s ? dateFmt.format(parse(s)) : "—");
export const fmtTime = (s: string) => timeFmt.format(parse(s));
export const fmtDateTime = (s: string) => `${dateFmt.format(parse(s))}, ${timeFmt.format(parse(s))}`;
export const fmtDay = (s: string) => dayFmt.format(parse(s));

export const inr = (v: string | number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v));

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** YYYY-MM-DD for a local date. */
export function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function initials(name: string) {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
