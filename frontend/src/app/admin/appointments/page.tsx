import type { Metadata } from "next";

import { AppointmentRow } from "@/components/appointment-row";
import { FilterForm } from "@/components/filter-form";
import { Pagination } from "@/components/pagination";
import { buttonClass, Card, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { qs, serverApi } from "@/lib/server-api";
import type { Appointment, Page } from "@/types/api";

import { AdminCancelAppointment } from "../row-actions";

export const metadata: Metadata = { title: "Appointments" };

const STATUSES = ["scheduled", "confirmed", "completed", "cancelled", "no_show"];

export default async function AdminAppointments({ searchParams }: { searchParams: { status?: string; day?: string; scope?: string; page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const status = STATUSES.includes(searchParams.status ?? "") ? searchParams.status : undefined;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.day ?? "") ? searchParams.day : undefined;
  const scope = ["upcoming", "past"].includes(searchParams.scope ?? "") ? searchParams.scope : "all";
  const data = await serverApi<Page<Appointment>>(`/appointments${qs({ status, day, scope, page, size: 25 })}`);

  return (
    <>
      <PageHeader title="Appointments" description="Monitor bookings across all doctors." />
      <FilterForm className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="scope" className="sr-only">Period</label>
        <Select id="scope" name="scope" defaultValue={scope} className="sm:w-40">
          <option value="all">All</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </Select>
        <label htmlFor="status" className="sr-only">Status</label>
        <Select id="status" name="status" defaultValue={status ?? ""} className="sm:w-44">
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", "-")}</option>)}
        </Select>
        <label htmlFor="day" className="sr-only">Date</label>
        <Input id="day" type="date" name="day" defaultValue={day} className="sm:w-44" />
        <button type="submit" className={buttonClass("outline")}>Apply</button>
      </FilterForm>
      <Card>
        {data.items.length ? (
          <ul className="divide-y">
            {data.items.map((a) => (
              <AppointmentRow key={a.id} a={a} perspective="admin" actions={<AdminCancelAppointment id={a.id} status={a.status} />} />
            ))}
          </ul>
        ) : (
          <EmptyState title="No appointments match" />
        )}
        <Pagination page={data.page} size={data.size} total={data.total} basePath="/admin/appointments" params={{ status, day, scope }} />
      </Card>
    </>
  );
}
