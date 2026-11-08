import { CalendarClock, CalendarPlus, CalendarX2, FileText, FlaskConical, IndianRupee, Pill, Wallet } from "lucide-react";
import Link from "next/link";

import { AppointmentRow } from "@/components/appointment-row";
import { buttonClass, Card, CardHeader, EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { getMe, serverApi } from "@/lib/server-api";
import { fmtDate, inr } from "@/lib/utils";
import type { Appointment, Invoice, LabReport, Page, Prescription } from "@/types/api";

export default async function PatientHome() {
  const [me, upcoming, rx, labs, invoices] = await Promise.all([
    getMe(),
    serverApi<Page<Appointment>>("/appointments?scope=upcoming&size=4"),
    serverApi<Prescription[]>("/patients/me/prescriptions"),
    serverApi<LabReport[]>("/patients/me/labs"),
    serverApi<Invoice[]>("/patients/me/invoices"),
  ]);
  const unpaid = invoices.filter((i) => i.status === "unpaid");
  const due = unpaid.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <>
      <PageHeader
        title={`Hello, ${me?.full_name.split(" ")[0]}`}
        description="Here's a summary of your care."
        action={
          <Link href="/patient/doctors" className={buttonClass()}>
            <CalendarPlus className="h-4 w-4" /> Book appointment
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Upcoming visits" value={upcoming.total} icon={<CalendarClock className="h-5 w-5" />} tone="primary" />
        <StatCard label="Prescriptions" value={rx.length} icon={<Pill className="h-5 w-5" />} tone="info" />
        <StatCard label="Pending lab results" value={labs.filter((l) => l.status === "requested").length} icon={<FlaskConical className="h-5 w-5" />} tone="warning" />
        <StatCard label="Amount due" value={inr(due)} hint={`${unpaid.length} unpaid invoice(s)`} icon={<IndianRupee className="h-5 w-5" />} tone={due > 0 ? "danger" : "success"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            icon={<CalendarClock className="h-4 w-4" />}
            title="Upcoming appointments"
            action={<Link href="/patient/appointments" className="text-sm font-medium text-primary hover:underline">View all</Link>}
          />
          {upcoming.items.length ? (
            <ul className="divide-y">
              {upcoming.items.map((a) => (
                <AppointmentRow key={a.id} a={a} perspective="patient" />
              ))}
            </ul>
          ) : (
            <EmptyState icon={<CalendarX2 className="h-6 w-6" />} title="No upcoming appointments">
              <Link href="/patient/doctors" className="text-primary hover:underline">Find a doctor</Link> to book one.
            </EmptyState>
          )}
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              icon={<Pill className="h-4 w-4" />}
              title="Recent prescriptions"
              action={<Link href="/patient/records?tab=prescriptions" className="text-sm font-medium text-primary hover:underline">All</Link>}
            />
            {rx.length ? (
              <ul className="divide-y">
                {rx.slice(0, 3).map((p) => (
                  <li key={p.id} className="flex gap-3 px-4 py-3 sm:px-5">
                    <Pill className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.items.map((i) => i.medication).join(", ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.doctor_name} · {fmtDate(p.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<FileText className="h-6 w-6" />} title="No prescriptions yet" />
            )}
          </Card>
          <Card>
            <CardHeader
              icon={<Wallet className="h-4 w-4" />}
              title="Billing"
              action={<Link href="/patient/billing" className="text-sm font-medium text-primary hover:underline">Details</Link>}
            />
            {invoices.length ? (
              <ul className="divide-y">
                {invoices.slice(0, 3).map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm">{i.description}</span>
                    <span className="text-sm tabular-nums">{inr(i.amount)}</span>
                    <StatusBadge status={i.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No invoices" />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
