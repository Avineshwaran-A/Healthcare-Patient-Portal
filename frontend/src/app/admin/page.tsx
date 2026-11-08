import { BarChart3, Building2, CalendarDays, CircleCheck, Clock3, PieChart, Stethoscope, UserCheck, Users } from "lucide-react";
import Link from "next/link";

import { buttonClass, Card, CardBody, CardHeader, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { serverApi } from "@/lib/server-api";
import { fmtDay, inr } from "@/lib/utils";
import type { Stats } from "@/types/api";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-info",
  confirmed: "bg-primary",
  completed: "bg-success",
  cancelled: "bg-muted-foreground/50",
  no_show: "bg-warning",
};

export default async function AdminHome() {
  const s = await serverApi<Stats>("/admin/stats");
  const max = Math.max(1, ...s.appointments_last_7_days.map((d) => d.count));
  const week = s.appointments_last_7_days.reduce((a, d) => a + d.count, 0);
  const statuses = Object.keys(STATUS_COLORS);
  const total = Object.values(s.appointments_by_status).reduce((a, b) => a + b, 0) || 1;
  const paid = Number(s.revenue_paid);
  const outstanding = Number(s.revenue_outstanding);
  const collectedPct = paid + outstanding ? Math.round((paid / (paid + outstanding)) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Hospital overview"
        description="Live figures from the patient portal."
        action={
          <Link href="/admin/appointments?scope=upcoming" className={buttonClass("outline")}>
            <CalendarDays className="h-4 w-4" /> Upcoming appointments
          </Link>
        }
      />

      {s.pending_doctors > 0 && (
        <Link
          href="/admin/doctors?approved=false"
          className="mb-6 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm transition-colors hover:bg-warning/10"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
            <UserCheck className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="font-semibold">{s.pending_doctors} doctor registration(s)</span> awaiting your approval
          </span>
          <span className="font-medium text-warning">Review →</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Patients" value={s.patients} icon={<Users className="h-5 w-5" />} tone="primary" />
        <StatCard label="Active doctors" value={s.doctors} icon={<Stethoscope className="h-5 w-5" />} tone="info" />
        <StatCard label="Departments" value={s.departments} icon={<Building2 className="h-5 w-5" />} tone="neutral" />
        <StatCard
          label="Appointments today"
          value={s.appointments_today}
          icon={<CalendarDays className="h-5 w-5" />}
          tone="success"
          hint={`${s.appointments_upcoming} upcoming in total`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader icon={<BarChart3 className="h-4 w-4" />} title="Appointments, last 7 days" description={`${week} booked this week`} />
          <CardBody>
            {/* Pure CSS bar chart — no charting library needed. */}
            <div className="relative h-56" role="img" aria-label={`Appointments per day for the last seven days: ${s.appointments_last_7_days.map((d) => d.count).join(", ")}`}>
              <div className="absolute inset-x-0 top-6 bottom-7 flex flex-col justify-between" aria-hidden>
                {[0, 1, 2, 3].map((i) => <div key={i} className="border-t border-dashed" />)}
              </div>
              <div className="relative flex h-full items-end gap-2 sm:gap-4">
                {s.appointments_last_7_days.map((d, i) => {
                  const today = i === s.appointments_last_7_days.length - 1;
                  return (
                    <div key={d.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                      <span className="text-xs font-semibold tabular-nums text-foreground">{d.count}</span>
                      <div className="flex w-full flex-1 items-end justify-center">
                        <div
                          className={`w-full max-w-12 rounded-t-md transition-colors ${today ? "bg-primary" : "bg-primary/30 group-hover:bg-primary/50"}`}
                          style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 6 : 2 }}
                        />
                      </div>
                      <span className={`text-xs ${today ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                        {today ? "Today" : fmtDay(d.date).split(",")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<PieChart className="h-4 w-4" />} title="By status" description={`${total} appointments overall`} />
          <CardBody>
            <div className="mb-5 flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              {statuses.map((st) => (
                <div key={st} className={STATUS_COLORS[st]} style={{ width: `${((s.appointments_by_status[st] ?? 0) / total) * 100}%` }} />
              ))}
            </div>
            <ul className="space-y-3">
              {statuses.map((st) => (
                <li key={st} className="flex items-center justify-between text-sm">
                  <StatusBadge status={st} />
                  <span className="font-medium tabular-nums">
                    {s.appointments_by_status[st] ?? 0}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {Math.round(((s.appointments_by_status[st] ?? 0) / total) * 100)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Revenue collected" value={inr(s.revenue_paid)} icon={<CircleCheck className="h-5 w-5" />} tone="success" />
        <StatCard label="Outstanding" value={inr(s.revenue_outstanding)} icon={<Clock3 className="h-5 w-5" />} tone="warning" />
        <Card className="p-4 sm:p-5">
          <p className="text-sm font-medium text-muted-foreground">Collection rate</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-[28px]">{collectedPct}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-success" style={{ width: `${collectedPct}%` }} />
          </div>
          <Link href="/admin/billing?status=unpaid" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
            View unpaid invoices →
          </Link>
        </Card>
      </div>
    </>
  );
}
