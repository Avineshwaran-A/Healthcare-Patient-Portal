import type { Metadata } from "next";

import { FilterForm } from "@/components/filter-form";
import { Pagination } from "@/components/pagination";
import { buttonClass, Card, EmptyState, PageHeader, Select, TableWrap } from "@/components/ui";
import { qs, serverApi } from "@/lib/server-api";
import { fmtDateTime } from "@/lib/utils";
import type { AuditEntry, Page } from "@/types/api";

export const metadata: Metadata = { title: "Audit log" };

const GROUPS = ["auth", "appointment", "record", "lab", "availability", "doctor", "department", "user", "invoice", "profile"];

export default async function AuditPage({ searchParams }: { searchParams: { action?: string; page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const action = GROUPS.includes(searchParams.action ?? "") ? searchParams.action : undefined;
  const data = await serverApi<Page<AuditEntry>>(`/admin/audit-logs${qs({ action, page, size: 50 })}`);

  return (
    <>
      <PageHeader title="Audit log" description="Security-relevant events, including every access to patient records. Clinical content is never logged." />
      <FilterForm className="mb-4 flex gap-2">
        <label htmlFor="action" className="sr-only">Event type</label>
        <Select id="action" name="action" defaultValue={action ?? ""} className="w-48">
          <option value="">All events</option>
          {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </Select>
        <button type="submit" className={buttonClass("outline")}>Filter</button>
      </FilterForm>
      <Card>
        {data.items.length ? (
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Event</th>
                  <th>Target</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap text-xs">{fmtDateTime(a.created_at)}</td>
                    <td className="text-xs">{a.actor ?? "—"}</td>
                    <td>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{a.action}</code>
                      {a.detail && <span className="ml-1 text-xs text-muted-foreground">{a.detail}</span>}
                    </td>
                    <td className="whitespace-nowrap text-xs">{a.entity_type ? `${a.entity_type} #${a.entity_id}` : "—"}</td>
                    <td className="text-xs tabular-nums">{a.ip_address ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="No events" />
        )}
        <Pagination page={data.page} size={data.size} total={data.total} basePath="/admin/audit" params={{ action }} />
      </Card>
    </>
  );
}
