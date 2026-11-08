import { ArrowLeft, GraduationCap, IndianRupee } from "lucide-react";
import Link from "next/link";

import { Badge, Card, CardBody, CardHeader } from "@/components/ui";
import { serverApi } from "@/lib/server-api";
import { initials, inr, WEEKDAYS } from "@/lib/utils";
import type { Appointment, DoctorDetail } from "@/types/api";

import { BookingPanel } from "./booking-panel";

export default async function DoctorProfilePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { reschedule?: string };
}) {
  const doctor = await serverApi<DoctorDetail>(`/doctors/${Number(params.id)}`);
  const rescheduling = searchParams.reschedule
    ? await serverApi<Appointment>(`/appointments/${Number(searchParams.reschedule)}`)
    : null;
  const days = Array.from(new Set(doctor.availability.map((w) => w.weekday))).sort();

  return (
    <>
      <Link href="/patient/doctors" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All doctors
      </Link>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 lg:self-start">
          <CardBody>
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground">
                {initials(doctor.full_name)}
              </span>
              <div>
                <h1 className="text-xl">{doctor.full_name}</h1>
                <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {doctor.department && <Badge tone="primary">{doctor.department.name}</Badge>}
              <Badge>{doctor.experience_years} years experience</Badge>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex gap-3">
                <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <dd>{doctor.qualifications}</dd>
              </div>
              <div className="flex gap-3">
                <IndianRupee className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <dd>{inr(doctor.consultation_fee)} consultation fee</dd>
              </div>
            </dl>
            {doctor.bio && <p className="mt-4 text-sm text-muted-foreground">{doctor.bio}</p>}
            <div className="mt-5 border-t pt-4">
              <p className="text-sm font-medium">Works on</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {days.length ? days.map((d) => WEEKDAYS[d].slice(0, 3)).join(", ") : "No availability published"}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader
            title={rescheduling ? "Choose a new time" : "Book an appointment"}
            description="Times shown are hospital local time."
          />
          <CardBody>
            <BookingPanel doctorId={doctor.id} rescheduleId={rescheduling?.id ?? null} workdays={days} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
