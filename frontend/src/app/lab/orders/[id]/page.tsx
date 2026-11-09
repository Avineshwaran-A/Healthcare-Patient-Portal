import { ArrowLeft, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LabList } from "@/components/clinical";
import { Card, CardBody, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { getMe, serverApi } from "@/lib/server-api";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import type { LabOrderDetail } from "@/types/api";

import { ClaimButton, OrderActions } from "../../actions";

export const metadata: Metadata = { title: "Lab order" };

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

export default async function LabOrder({ params }: { params: { id: string } }) {
  const [d, me] = await Promise.all([serverApi<LabOrderDetail>(`/lab/orders/${Number(params.id) || 0}`), getMe()]);
  const { order: o, patient: p } = d;
  const mine = o.assigned_to_id !== null && o.assigned_to_id === me?.id;

  return (
    <>
      <Link href="/lab" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Work queue
      </Link>
      <PageHeader title={o.test_name} description={`Order #${o.id} · requested by ${o.doctor_name}`} action={<StatusBadge status={o.status} />} />
      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Patient identification" description="Minimum details for sample identification." />
            <CardBody>
              <dl className="divide-y">
                <Row k="Patient ID" v={<span className="tabular-nums">{p.patient_code}</span>} />
                <Row k="Name" v={p.full_name} />
                <Row k="Date of birth" v={fmtDate(p.date_of_birth)} />
                <Row k="Sex" v={p.gender || "—"} />
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Order" />
            <CardBody>
              <dl className="divide-y">
                <Row k="Requested" v={fmtDateTime(o.requested_at)} />
                <Row k="Sample collected" v={o.collected_at ? fmtDateTime(o.collected_at) : "—"} />
                <Row k="Verified" v={o.completed_at ? fmtDateTime(o.completed_at) : "—"} />
                <Row k="Assigned to" v={o.assigned_to || "Unassigned"} />
              </dl>
            </CardBody>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Result" description={o.amended_at ? `Amended ${fmtDateTime(o.amended_at)}: ${o.amendment_reason}` : undefined} />
            <CardBody className="space-y-4">
              {o.result_summary ? (
                <p className="whitespace-pre-line text-sm">{o.result_summary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No result entered yet.</p>
              )}
              {o.has_file && (
                <a href={`/api/labs/${o.id}/file`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  <Download className="h-4 w-4" /> {o.file_name || "Report"}
                </a>
              )}
              <div className="border-t pt-4">
                {o.assigned_to_id === null ? <ClaimButton id={o.id} size="default" /> : mine ? <OrderActions lab={o} /> : null}
              </div>
            </CardBody>
          </Card>
          {mine && (
            <section>
              <h2 className="mb-3">Earlier verified results for this patient</h2>
              <LabList labs={d.history} />
            </section>
          )}
        </div>
      </div>
    </>
  );
}
