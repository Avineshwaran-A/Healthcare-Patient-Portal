import { CircleCheck, Clock3, Receipt, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { Card, CardBody, CardHeader, EmptyState, PageHeader, StatCard, StatusBadge, TableWrap } from "@/components/ui";
import { serverApi } from "@/lib/server-api";
import { fmtDate, inr } from "@/lib/utils";
import type { Claim, Invoice, PatientProfile } from "@/types/api";

const METHOD: Record<string, string> = { upi: "UPI", card: "Card", cash: "Cash", bank_transfer: "Bank transfer", insurance: "Insurance" };

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const [invoices, claims, profile] = await Promise.all([
    serverApi<Invoice[]>("/patients/me/invoices"),
    serverApi<Claim[]>("/patients/me/claims"),
    serverApi<PatientProfile>("/patients/me"),
  ]);
  const sum = (s: string) => invoices.filter((i) => i.status === s).reduce((t, i) => t + Number(i.amount), 0);

  return (
    <>
      <PageHeader title="Billing" description="Invoices are issued automatically after each completed consultation." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Outstanding" value={inr(sum("unpaid"))} icon={<Clock3 className="h-5 w-5" />} tone="warning" />
        <StatCard label="Paid" value={inr(sum("paid"))} icon={<CircleCheck className="h-5 w-5" />} tone="success" />
        <Card className="p-4 sm:col-span-2 sm:p-5 lg:col-span-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Insurance</p>
              <p className="mt-2 truncate font-semibold">{profile.insurer || "None on file"}</p>
              {profile.policy_number && <p className="text-xs tabular-nums text-muted-foreground">Policy {profile.policy_number}</p>}
            </div>
            <StatusBadge status={profile.insurance_status} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Insurance details are updated by the billing desk.</p>
        </Card>
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
                      {i.paid_at && (
                        <div className="text-xs text-muted-foreground">
                          {fmtDate(i.paid_at)}
                          {i.payment_method && ` · ${METHOD[i.payment_method] ?? i.payment_method}`}
                        </div>
                      )}
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
      {claims.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Insurance claims" icon={<ShieldCheck className="h-4 w-4" />} />
          <CardBody className="p-0">
            <TableWrap>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Claim</th>
                    <th>Insurer</th>
                    <th className="text-right">Claimed</th>
                    <th className="text-right">Approved</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((c) => (
                    <tr key={c.id}>
                      <td className="tabular-nums">
                        #{c.id}
                        <div className="text-xs text-muted-foreground">Invoice #{c.invoice_id}</div>
                      </td>
                      <td>{c.insurer}</td>
                      <td className="text-right tabular-nums">{inr(c.amount_claimed)}</td>
                      <td className="text-right tabular-nums">{c.amount_approved ? inr(c.amount_approved) : "—"}</td>
                      <td><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </CardBody>
        </Card>
      )}
    </>
  );
}
