import { CalendarCheck2, CalendarClock, CheckCircle2, FlaskConical } from "lucide-react";
import Link from "next/link";

import { AppointmentRow } from "@/components/appointment-row";
import { Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { getMe, serverApi } from "@/lib/server-api";
import type { DoctorDashboard } from "@/types/api";

export default async function DoctorHome() {
  const [me, d] = await Promise.all([getMe(), serverApi<DoctorDashboard>("/doctor/dashboard")]);
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <PageHeader title={`Good day, ${me?.full_name}`} description={today} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" value={d.today.length} icon={<CalendarCheck2 className="h-5 w-5" />} tone="primary" />
        <StatCard label="Upcoming" value={d.upcoming_count} icon={<CalendarClock className="h-5 w-5" />} tone="info" />
        <StatCard label="Completed this week" value={d.completed_this_week} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="Pending lab results" value={d.pending_labs} icon={<FlaskConical className="h-5 w-5" />} tone="warning" />
      </div>
      <Card className="mt-6">
        <CardHeader
          icon={<CalendarCheck2 className="h-4 w-4" />}
          title="Today's appointments"
          action={<Link href="/doctor/appointments" className="text-sm font-medium text-primary hover:underline">Full schedule</Link>}
        />
        {d.today.length ? (
          <ul className="divide-y">
            {d.today.map((a) => (
              <AppointmentRow key={a.id} a={a} perspective="doctor" href={`/doctor/appointments/${a.id}`} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CalendarCheck2 className="h-6 w-6" />} title="No appointments today" />
        )}
      </Card>
    </>
  );
}
