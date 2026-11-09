import { CircleCheck, Clock3, Pill, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardHeader, EmptyState, PageHeader, StatCard, StatusBadge, TableWrap } from "@/components/ui";
import { serverApi } from "@/lib/server-api";
import { fmtDate, inr } from "@/lib/utils";
import type { BillingSummary, Invoice, Page } from "@/types/api";

import { NewInvoiceButton } from "./actions";

export const metadata: Metadata = { title: "Billing overview" };

export default async function BillingHome() {
  const [s, unpaid] = await Promise.all([
    serverApi<BillingSummary>("/billing/summary"),
    serverApi<Page<Invoice>>("/billing/invoices?status=unpaid&size=6"),
  ]);
  return (
    <>
      <PageHeader title="Billing and insurance" description="Invoices, payments, insurance claims and prescription fulfilment." action={<NewInvoiceButton />} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Outstanding" value={inr(s.unpaid_total)} hint={`${s.unpaid_count} unpaid invoice(s)`} icon={<Clock3 className="h-5 w-5" />} tone="warning" />
        <StatCard label="Collected today" value={inr(s.collected_today)} icon={<CircleCheck className="h-5 w-5" />} tone="success" />
        <StatCard label="Open claims" value={s.open_claims} icon={<ShieldCheck className="h-5 w-5" />} tone="info" />
        <StatCard label="Prescriptions to fulfil" value={s.pending_fulfilment} icon={<Pill className="h-5 w-5" />} tone="primary" />
      </div>
      <Card>
        <CardHeader
          title="Unpaid invoices"
          action={
            <Link href="/billing/invoices?status=unpaid" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          }
        />
        {unpaid.items.length ? (
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
                </tr>
              </thead>
              <tbody>
                {unpaid.items.map((i) => (
                  <tr key={i.id}>
                    <td className="tabular-nums">{i.id}</td>
                    <td>
                      <div className="font-medium">{i.patient_name}</div>
                      <div className="text-xs tabular-nums text-muted-foreground">{i.patient_code}</div>
                    </td>
                    <td className="min-w-[12rem]">{i.description}</td>
                    <td className="whitespace-nowrap">{fmtDate(i.issued_at)}</td>
                    <td className="text-right tabular-nums">{inr(i.amount)}</td>
                    <td><StatusBadge status={i.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="No unpaid invoices" />
        )}
      </Card>
    </>
  );
}
