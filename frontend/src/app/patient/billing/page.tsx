import { CircleCheck, Clock3, Receipt } from "lucide-react";
import type { Metadata } from "next";

import { Card, EmptyState, PageHeader, StatCard, StatusBadge, TableWrap } from "@/components/ui";
import { serverApi } from "@/lib/server-api";
import { fmtDate, inr } from "@/lib/utils";
import type { Invoice } from "@/types/api";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const invoices = await serverApi<Invoice[]>("/patients/me/invoices");
  const sum = (s: string) => invoices.filter((i) => i.status === s).reduce((t, i) => t + Number(i.amount), 0);

  return (
    <>
      <PageHeader title="Billing" description="Invoices are issued automatically after each completed consultation." />
      <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-lg">
        <StatCard label="Outstanding" value={inr(sum("unpaid"))} icon={<Clock3 className="h-5 w-5" />} tone="warning" />
        <StatCard label="Paid" value={inr(sum("paid"))} icon={<CircleCheck className="h-5 w-5" />} tone="success" />
      </div>
      <Card>
        {invoices.length ? (
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Description</th>
                  <th>Issued</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="tabular-nums">#{i.id}</td>
                    <td className="min-w-[14rem]">{i.description}</td>
                    <td className="whitespace-nowrap">{fmtDate(i.issued_at)}</td>
                    <td className="text-right tabular-nums">{inr(i.amount)}</td>
                    <td>
                      <StatusBadge status={i.status} />
                      {i.paid_at && <div className="text-xs text-muted-foreground">{fmtDate(i.paid_at)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState icon={<Receipt className="h-6 w-6" />} title="No invoices yet" />
        )}
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">Payments are recorded at the hospital billing desk. Online payment is not enabled.</p>
    </>
  );
}
