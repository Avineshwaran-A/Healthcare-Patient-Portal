import type { Metadata } from "next";
import Link from "next/link";

import { Pagination } from "@/components/pagination";
import { Badge, Card, chipClass, EmptyState, PageHeader, TableWrap } from "@/components/ui";
import { qs, serverApi } from "@/lib/server-api";
import type { AdminDoctorRow, Page } from "@/types/api";

import { ApproveButton, ToggleUserButton } from "../row-actions";

export const metadata: Metadata = { title: "Doctors" };

export default async function AdminDoctors({ searchParams }: { searchParams: { approved?: string; page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const approved = searchParams.approved === "false" ? "false" : searchParams.approved === "true" ? "true" : undefined;
  const data = await serverApi<Page<AdminDoctorRow>>(`/admin/doctors${qs({ approved, page })}`);

  const filter = (v: string | undefined, label: string) => (
    <Link
      href={`/admin/doctors${v ? `?approved=${v}` : ""}`}
      className={chipClass(approved === v)}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader title="Doctors" description="Approve registrations and manage doctor accounts and schedules." />
      <div className="mb-4 flex gap-2">
        {filter(undefined, "All")}
        {filter("false", "Pending approval")}
        {filter("true", "Approved")}
      </div>
      <Card>
        {data.items.length ? (
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Specialty</th>
                  <th>Reg. no.</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="font-medium">{d.full_name}</div>
                      <div className="text-xs text-muted-foreground">{d.email}</div>
                    </td>
                    <td>
                      {d.specialty}
                      <div className="text-xs text-muted-foreground">{d.department ?? "No department"}</div>
                    </td>
                    <td className="tabular-nums">{d.registration_number}</td>
                    <td className="space-x-1 whitespace-nowrap">
                      {d.is_approved ? <Badge tone="success">Approved</Badge> : <Badge tone="warning">Pending</Badge>}
                      {!d.is_active && <Badge tone="danger">Disabled</Badge>}
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        {!d.is_approved && <ApproveButton doctorId={d.id} />}
                        {d.is_approved && (
                          <Link href={`/admin/doctors/${d.id}`} className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted">
                            Manage
                          </Link>
                        )}
                        <ToggleUserButton userId={d.user_id} active={d.is_active} name={d.full_name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="No doctors found" />
        )}
        <Pagination page={data.page} size={data.size} total={data.total} basePath="/admin/doctors" params={{ approved }} />
      </Card>
    </>
  );
}
