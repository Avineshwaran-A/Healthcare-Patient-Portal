import type { Metadata } from "next";

import { FilterForm } from "@/components/filter-form";
import { Pagination } from "@/components/pagination";
import { buttonClass, Card, EmptyState, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { qs, serverApi } from "@/lib/server-api";
import { fmtDate } from "@/lib/utils";
import type { FulfilmentRow, Page } from "@/types/api";

import { FulfilmentActions } from "../actions";
import { pick, SearchBox, StatusChips } from "../status-chips";

export const metadata: Metadata = { title: "Prescription fulfilment" };

const STATUSES = ["pending", "ready", "dispensed", "unavailable"];

export default async function Fulfilment({ searchParams }: { searchParams: { status?: string; q?: string; page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const status = pick(searchParams.status, STATUSES);
  const data = await serverApi<Page<FulfilmentRow>>(`/billing/prescriptions${qs({ status, q: searchParams.q, page })}`);
  return (
    <>
      <PageHeader
        title="Prescription fulfilment"
        description="Track stock and dispensing. Medicines, doses and instructions are set by the prescribing doctor and can't be changed here."
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatusChips basePath="/billing/prescriptions" current={status} values={STATUSES} q={searchParams.q} />
        <FilterForm className="mb-4 flex w-full gap-2 sm:w-auto">
          <SearchBox q={searchParams.q} status={status} />
          <button type="submit" className={buttonClass("outline")}>Search</button>
        </FilterForm>
      </div>
      <Card>
        {data.items.length ? (
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Prescription</th>
                  <th>Patient</th>
                  <th>Medicines</th>
                  <th>Status</th>
                  <th className="text-right">Update</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">
                      <div className="tabular-nums">#{p.id}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.doctor_name} · {fmtDate(p.created_at)}
                      </div>
                    </td>
                    <td>
                      <div className="whitespace-nowrap font-medium">{p.patient_name}</div>
                      <div className="text-xs tabular-nums text-muted-foreground">{p.patient_code}</div>
                    </td>
                    <td className="min-w-[14rem]">
                      <ul className="space-y-0.5">
                        {p.items.map((i) => (
                          <li key={i.id}>
                            <span className="font-medium">{i.medication}</span>
                            <span className="text-muted-foreground"> · {i.dosage} · {i.duration_days} days</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td><StatusBadge status={p.fulfilment_status} /></td>
                    <td><FulfilmentActions id={p.id} status={p.fulfilment_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="No prescriptions found" />
        )}
        <Pagination page={data.page} size={data.size} total={data.total} basePath="/billing/prescriptions" params={{ status, q: searchParams.q }} />
      </Card>
    </>
  );
}
