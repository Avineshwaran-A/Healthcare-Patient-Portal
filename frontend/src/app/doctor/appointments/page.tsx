import { CalendarX2 } from "lucide-react";
import type { Metadata } from "next";

import { AppointmentRow } from "@/components/appointment-row";
import { FilterForm } from "@/components/filter-form";
import { Pagination } from "@/components/pagination";
import { Tabs } from "@/components/tabs";
import { buttonClass, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { qs, serverApi } from "@/lib/server-api";
import type { Appointment, Page } from "@/types/api";

export const metadata: Metadata = { title: "Schedule" };

export default async function DoctorAppointments({ searchParams }: { searchParams: { tab?: string; day?: string; page?: string } }) {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.day ?? "") ? searchParams.day : undefined;
  const tab = day ? "day" : searchParams.tab === "past" ? "past" : "upcoming";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const data = await serverApi<Page<Appointment>>(
    `/appointments${qs({ scope: day ? "all" : tab, day, page, size: 20 })}`,
  );

  return (
    <>
      <PageHeader
        title="Schedule"
        action={
          <FilterForm className="flex gap-2">
            <label htmlFor="day" className="sr-only">Go to date</label>
            <Input id="day" type="date" name="day" defaultValue={day} className="w-auto" />
            <button type="submit" className={buttonClass("outline")}>Go</button>
          </FilterForm>
        }
      />
      <Tabs
        basePath="/doctor/appointments"
        current={tab}
        tabs={[
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past" },
        ]}
      />
      {day && <p className="mb-3 text-sm text-muted-foreground">Showing appointments on {day}</p>}
      <Card>
        {data.items.length ? (
          <ul className="divide-y">
            {data.items.map((a) => (
              <AppointmentRow key={a.id} a={a} perspective="doctor" href={`/doctor/appointments/${a.id}`} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CalendarX2 className="h-6 w-6" />} title="No appointments" />
        )}
        <Pagination page={data.page} size={data.size} total={data.total} basePath="/doctor/appointments" params={{ tab, day }} />
      </Card>
    </>
  );
}
