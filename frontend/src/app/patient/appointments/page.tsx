import { CalendarX2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AppointmentRow } from "@/components/appointment-row";
import { Pagination } from "@/components/pagination";
import { Tabs } from "@/components/tabs";
import { Alert, buttonClass, Card, EmptyState, PageHeader } from "@/components/ui";
import { qs, serverApi } from "@/lib/server-api";
import type { Appointment, Page } from "@/types/api";

import { CancelButton } from "./cancel-button";

export const metadata: Metadata = { title: "Appointments" };

export default async function PatientAppointments({ searchParams }: { searchParams: { tab?: string; page?: string; booked?: string } }) {
  const tab = searchParams.tab === "past" ? "past" : "upcoming";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const data = await serverApi<Page<Appointment>>(`/appointments${qs({ scope: tab, page, size: 10 })}`);

  return (
    <>
      <PageHeader
        title="Appointments"
        action={
          <Link href="/patient/doctors" className={buttonClass()}>
            Book new
          </Link>
        }
      />
      {searchParams.booked && (
        <div className="mb-4">
          <Alert tone="success">Your appointment is booked. The doctor has been notified.</Alert>
        </div>
      )}
      <Tabs
        basePath="/patient/appointments"
        current={tab}
        tabs={[
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past & cancelled" },
        ]}
      />
      <Card>
        {data.items.length ? (
          <ul className="divide-y">
            {data.items.map((a) => {
              const active = tab === "upcoming" && (a.status === "scheduled" || a.status === "confirmed");
              return (
                <AppointmentRow
                  key={a.id}
                  a={a}
                  perspective="patient"
                  actions={
                    active ? (
                      <>
                        <Link href={`/patient/doctors/${a.doctor.id}?reschedule=${a.id}`} className={buttonClass("outline", "sm")}>
                          Reschedule
                        </Link>
                        <CancelButton id={a.id} />
                      </>
                    ) : undefined
                  }
                />
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={<CalendarX2 className="h-6 w-6" />} title={tab === "upcoming" ? "No upcoming appointments" : "No past appointments"} />
        )}
        <Pagination page={data.page} size={data.size} total={data.total} basePath="/patient/appointments" params={{ tab }} />
      </Card>
    </>
  );
}
