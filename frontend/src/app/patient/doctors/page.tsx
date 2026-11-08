import { Search, UserRoundSearch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FilterForm } from "@/components/filter-form";
import { Pagination } from "@/components/pagination";
import { Badge, buttonClass, Card, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { qs, serverApi } from "@/lib/server-api";
import { initials, inr } from "@/lib/utils";
import type { Department, Doctor, Page } from "@/types/api";

export const metadata: Metadata = { title: "Find a doctor" };

type SP = { q?: string; department_id?: string; page?: string };

export default async function DoctorsPage({ searchParams }: { searchParams: SP }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [deps, doctors] = await Promise.all([
    serverApi<Department[]>("/departments"),
    serverApi<Page<Doctor>>(`/doctors${qs({ q: searchParams.q, department_id: searchParams.department_id, page, size: 12 })}`),
  ]);

  return (
    <>
      <PageHeader title="Find a doctor" description="Search by name or specialty and check availability." />
      <FilterForm className="mb-5 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="q" className="sr-only">Search doctors</label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="q" name="q" defaultValue={searchParams.q} placeholder="Name or specialty" className="pl-9" />
        </div>
        <label htmlFor="department_id" className="sr-only">Department</label>
        <Select id="department_id" name="department_id" defaultValue={searchParams.department_id ?? ""} className="sm:w-56">
          <option value="">All departments</option>
          {deps.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <button type="submit" className={buttonClass()}>Search</button>
      </FilterForm>

      {doctors.items.length ? (
        <Card>
          <ul className="grid gap-px overflow-hidden rounded-t-xl bg-border sm:grid-cols-2 lg:grid-cols-3">
            {doctors.items.map((d) => (
              <li key={d.id} className="group relative flex flex-col bg-card p-5 transition-colors hover:bg-accent/40">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                    {initials(d.full_name)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{d.full_name}</p>
                    <p className="text-sm text-muted-foreground">{d.specialty}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-1 text-xs text-muted-foreground">{d.qualifications}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.department && <Badge tone="primary">{d.department.name}</Badge>}
                  <Badge>{d.experience_years} yrs exp.</Badge>
                  <Badge>{inr(d.consultation_fee)}</Badge>
                </div>
                <Link href={`/patient/doctors/${d.id}`} className={buttonClass("outline", "sm", "mt-4 self-start after:absolute after:inset-0")}>
                  View availability
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            page={doctors.page}
            size={doctors.size}
            total={doctors.total}
            basePath="/patient/doctors"
            params={{ q: searchParams.q, department_id: searchParams.department_id }}
          />
        </Card>
      ) : (
        <Card>
          <EmptyState icon={<UserRoundSearch className="h-6 w-6" />} title="No doctors match your search" />
        </Card>
      )}
    </>
  );
}
