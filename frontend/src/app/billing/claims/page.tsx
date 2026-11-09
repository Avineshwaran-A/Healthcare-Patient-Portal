import type { Metadata } from "next";

import { FilterForm } from "@/components/filter-form";
import { Pagination } from "@/components/pagination";
import { buttonClass, Card, EmptyState, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { qs, serverApi } from "@/lib/server-api";
import { fmtDate, inr } from "@/lib/utils";
import type { Claim, Page } from "@/types/api";

import { ClaimActions } from "../actions";
import { pick, SearchBox, StatusChips } from "../status-chips";

export const metadata: Metadata = { title: "Insurance claims" };

const STATUSES = ["submitted", "approved", "rejected", "settled"];

export default async function Claims({ searchParams }: { searchParams: { status?: string; q?: string; page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const status = pick(searchParams.status, STATUSES);
  const data = await serverApi<Page<Claim>>(`/billing/claims${qs({ status, q: searchParams.q, page })}`);
  return (
    <>
      <PageHeader title="Insurance claims" description="File claims from the Invoices page. A claim needs the patient's insurance to be verified first." />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatusChips basePath="/billing/claims" current={status} values={STATUSES} q={searchParams.q} />
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
                  <th>Claim</th>
                  <th>Patient</th>
                  <th>Insurer</th>
                  <th className="text-right">Claimed</th>
                  <th className="text-right">Approved</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id}>
                    <td className="tabular-nums">
                      #{c.id}
                      <div className="text-xs text-muted-foreground">Invoice #{c.invoice_id}</div>
                    </td>
                    <td>
                      <div className="whitespace-nowrap font-medium">{c.patient_name}</div>
                      <div className="text-xs tabular-nums text-muted-foreground">{c.patient_code}</div>
                    </td>
                    <td>
                      <div>{c.insurer}</div>
                      <div className="text-xs tabular-nums text-muted-foreground">{c.policy_number}</div>
                    </td>
                    <td className="text-right tabular-nums">{inr(c.amount_claimed)}</td>
                    <td className="text-right tabular-nums">{c.amount_approved ? inr(c.amount_approved) : "—"}</td>
                    <td>
                      <StatusBadge status={c.status} />
                      {c.note && <div className="mt-1 max-w-[14rem] text-xs text-muted-foreground">{c.note}</div>}
                    </td>
                    <td className="whitespace-nowrap">{fmtDate(c.updated_at)}</td>
                    <td className="text-right"><ClaimActions c={c} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="No claims found" />
        )}
        <Pagination page={data.page} size={data.size} total={data.total} basePath="/billing/claims" params={{ status, q: searchParams.q }} />
      </Card>
    </>
  );
}
