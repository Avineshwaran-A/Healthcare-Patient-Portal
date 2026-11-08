import type { Metadata } from "next";

import { FilterForm } from "@/components/filter-form";
import { Pagination } from "@/components/pagination";
import { Badge, buttonClass, Card, EmptyState, Input, PageHeader, Select, TableWrap } from "@/components/ui";
import { qs, serverApi } from "@/lib/server-api";
import { fmtDate } from "@/lib/utils";
import type { Page, UserRow } from "@/types/api";

import { ToggleUserButton } from "../row-actions";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsers({ searchParams }: { searchParams: { role?: string; q?: string; page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const role = ["patient", "doctor", "admin"].includes(searchParams.role ?? "") ? searchParams.role : undefined;
  const data = await serverApi<Page<UserRow>>(`/admin/users${qs({ role, q: searchParams.q, page })}`);

  return (
    <>
      <PageHeader title="Users" description="Search accounts and control access. Disabled users cannot sign in." />
      <FilterForm className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="q" className="sr-only">Search users</label>
        <Input id="q" name="q" defaultValue={searchParams.q} placeholder="Name or email" className="sm:max-w-xs" />
        <label htmlFor="role" className="sr-only">Role</label>
        <Select id="role" name="role" defaultValue={role ?? ""} className="sm:w-40">
          <option value="">All roles</option>
          <option value="patient">Patients</option>
          <option value="doctor">Doctors</option>
          <option value="admin">Admins</option>
        </Select>
        <button type="submit" className={buttonClass("outline")}>Filter</button>
      </FilterForm>
      <Card>
        {data.items.length ? (
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th className="text-right">Access</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="font-medium">{u.full_name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="capitalize">{u.role}</td>
                    <td className="whitespace-nowrap">{fmtDate(u.created_at)}</td>
                    <td>{u.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Disabled</Badge>}</td>
                    <td className="text-right">{u.role !== "admin" && <ToggleUserButton userId={u.id} active={u.is_active} name={u.full_name} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="No users found" />
        )}
        <Pagination page={data.page} size={data.size} total={data.total} basePath="/admin/users" params={{ role, q: searchParams.q }} />
      </Card>
    </>
  );
}
