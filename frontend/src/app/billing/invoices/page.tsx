import type { Metadata } from "next";

import { FilterForm } from "@/components/filter-form";
import { Pagination } from "@/components/pagination";
import { buttonClass, Card, EmptyState, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { qs, serverApi } from "@/lib/server-api";
import { fmtDate, inr } from "@/lib/utils";
import type { Invoice, Page } from "@/types/api";

import { FileClaimButton, InvoiceActions, NewInvoiceButton } from "../actions";
import { pick, SearchBox, StatusChips } from "../status-chips";

export const metadata: Metadata = { title: "Invoices" };

const METHOD: Record<string, string> = { upi: "UPI", card: "Card", cash: "Cash", bank_transfer: "Bank transfer", insurance: "Insurance" };

export default async function Invoices({ searchParams }: { searchParams: { status?: string; q?: string; page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const status = pick(searchParams.status, ["unpaid", "paid", "void"]);
  const data = await serverApi<Page<Invoice>>(`/billing/invoices${qs({ status, q: searchParams.q, page })}`);
  return (
    <>
      <PageHeader title="Invoices" description="Paid and void invoices are final. Every change is recorded in the audit log." action={<NewInvoiceButton />} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatusChips basePath="/billing/invoices" current={status} values={["unpaid", "paid", "void"]} q={searchParams.q} />
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
                  <th>#</th>
                  <th>Patient</th>
                  <th>Description</th>
                  <th>Issued</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((i) => (
                  <tr key={i.id}>
                    <td className="tabular-nums">{i.id}</td>
                    <td>
                      <div className="whitespace-nowrap font-medium">{i.patient_name}</div>
                      <div className="text-xs tabular-nums text-muted-foreground">{i.patient_code}</div>
                    </td>
                    <td className="min-w-[12rem]">{i.description}</td>
                    <td className="whitespace-nowrap">{fmtDate(i.issued_at)}</td>
                    <td className="text-right tabular-nums">{inr(i.amount)}</td>
                    <td><StatusBadge status={i.status} /></td>
                    <td className="text-xs text-muted-foreground">
                      {i.status === "paid" ? (
                        <>
                          <div className="text-foreground">{METHOD[i.payment_method ?? ""] ?? i.payment_method}</div>
                          {fmtDate(i.paid_at)}
                          {i.payment_reference && <div className="tabular-nums">{i.payment_reference}</div>}
                        </>
                      ) : i.status === "void" ? (
                        i.note
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        {i.status === "unpaid" && <InvoiceActions id={i.id} amount={inr(i.amount)} />}
                        {i.status !== "void" && <FileClaimButton invoiceId={i.id} amount={i.amount} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="No invoices found" />
        )}
        <Pagination page={data.page} size={data.size} total={data.total} basePath="/billing/invoices" params={{ status, q: searchParams.q }} />
      </Card>
    </>
  );
}
