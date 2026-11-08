import Link from "next/link";

import { cn, fmtDay, fmtTime, initials } from "@/lib/utils";
import type { Appointment } from "@/types/api";

import { StatusBadge } from "./ui";

/** Compact appointment line, used across all three workspaces. */
export function AppointmentRow({
  a,
  perspective,
  href,
  actions,
}: {
  a: Appointment;
  perspective: "patient" | "doctor" | "admin";
  href?: string;
  actions?: React.ReactNode;
}) {
  const who =
    perspective === "patient"
      ? { title: a.doctor.full_name, sub: a.specialty }
      : perspective === "doctor"
        ? { title: a.patient.full_name, sub: a.reason || "No reason given" }
        : { title: `${a.patient.full_name} → ${a.doctor.full_name}`, sub: a.specialty };
  const muted = a.status === "cancelled" || a.status === "no_show";

  return (
    <li className={cn("group relative flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:px-5", muted && "opacity-75")}>
      <div className="flex w-[4.5rem] shrink-0 flex-col items-center rounded-lg border bg-background py-1.5 text-center">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">{fmtDay(a.start_at).split(",")[0]}</span>
        <span className="text-sm font-semibold tabular-nums">{fmtTime(a.start_at)}</span>
      </div>
      <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground sm:flex">
        {initials(perspective === "patient" ? a.doctor.full_name : a.patient.full_name)}
      </span>
      <div className="min-w-0 flex-1">
        {href ? (
          // Stretched link: the whole row is clickable.
          <Link href={href} className="font-medium after:absolute after:inset-0 group-hover:text-primary">
            {who.title}
          </Link>
        ) : (
          <span className="font-medium">{who.title}</span>
        )}
        <p className="truncate text-sm text-muted-foreground">
          {fmtDay(a.start_at).split(",").slice(1).join(",").trim()} · {who.sub}
        </p>
      </div>
      <StatusBadge status={a.status} />
      {actions && <div className="relative z-10 flex w-full gap-2 sm:w-auto">{actions}</div>}
    </li>
  );
}
