import type { Metadata } from "next";
import Link from "next/link";

import { Pagination } from "@/components/pagination";
import { Card, chipClass, EmptyState, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { qs, serverApi } from "@/lib/server-api";
import { fmtDate, inr } from "@/lib/utils";
import type { Invoice, Page } from "@/types/api";

import { InvoiceActions } from "../row-actions";

export const metadata: Metadata = { title: "Billing" };

export default async function AdminBilling({ searchParams }: { searchParams: { status?: string; page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const status = ["unpaid", "paid", "void"].includes(searchParams.status ?? "") ? searchParams.status : undefined;
  const data = await serverApi<Page<Invoice>>(`/admin/invoices${qs({ status, page })}`);

  return (
    <>
      <PageHeader title="Billing" description="Invoices are created when a consultation is completed. Record payments taken at the desk." />
      <div className="mb-4 flex gap-2">
        {[undefined, "unpaid", "paid", "void"].map((s) => (
          <Link
            key={s ?? "all"}
            href={`/admin/billing${s ? `?status=${s}` : ""}`}
            className={chipClass(status === s) + " capitalize"}
          >
            {s ?? "All"}
          </Link>
        ))}
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
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((i) => (
                  <tr key={i.id}>
                    <td className="tabular-nums">{i.id}</td>
                    <td className="whitespace-nowrap font-medium">{i.patient_name}</td>
                    <td className="min-w-[14rem]">{i.description}</td>
                    <td className="whitespace-nowrap">{fmtDate(i.issued_at)}</td>
                    <td className="text-right tabular-nums">{inr(i.amount)}</td>
                    <td><StatusBadge status={i.status} /></td>
                    <td>{i.status === "unpaid" && <InvoiceActions id={i.id} amount={inr(i.amount)} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="No invoices" />
        )}
        <Pagination page={data.page} size={data.size} total={data.total} basePath="/admin/billing" params={{ status }} />
      </Card>
    </>
  );
}
