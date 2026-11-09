import { Download, FileText, FlaskConical, Pill } from "lucide-react";

import { fmtDate } from "@/lib/utils";
import type { LabReport, MedicalRecord, Prescription } from "@/types/api";

import { Card, EmptyState, StatusBadge } from "./ui";

// Read-only clinical views shared by the patient workspace and the doctor's
// patient-history panel.

export function RecordList({ records, actions }: { records: MedicalRecord[]; actions?: (r: MedicalRecord) => React.ReactNode }) {
  if (!records.length) return <EmptyState icon={<FileText className="h-6 w-6" />} title="No consultation notes yet" />;
  return (
    <ul className="space-y-3">
      {records.map((r) => (
        <li key={r.id}>
          <Card className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{r.chief_complaint || "Consultation"}</p>
              <p className="text-xs text-muted-foreground">
                {r.doctor_name} · {fmtDate(r.created_at)}
              </p>
            </div>
            {r.assessment && (
              <p className="mt-2 text-sm">
                <span className="font-medium">Assessment: </span>
                {r.assessment}
              </p>
            )}
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{r.notes}</p>
            {(r.follow_up_date || r.amended_at || actions) && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-xs text-muted-foreground">
                {r.follow_up_date && (
                  <span>
                    <span className="font-medium text-foreground">Follow-up recommended</span> around {fmtDate(r.follow_up_date)}
                  </span>
                )}
                {r.amended_at && (
                  <span>
                    Amended {fmtDate(r.amended_at)}: {r.amendment_reason}
                  </span>
                )}
                <span className="ml-auto">{actions?.(r)}</span>
              </div>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function PrescriptionList({ prescriptions }: { prescriptions: Prescription[] }) {
  if (!prescriptions.length) return <EmptyState icon={<Pill className="h-6 w-6" />} title="No prescriptions yet" />;
  return (
    <ul className="space-y-3">
      {prescriptions.map((p) => (
        <li key={p.id}>
          <Card>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <p className="font-medium">Prescription #{p.id}</p>
                <StatusBadge status={p.fulfilment_status} variant="outline" />
              </div>
              <p className="text-xs text-muted-foreground">
                {p.doctor_name} · {fmtDate(p.created_at)}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Medication</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {p.items.map((i) => (
                    <tr key={i.id}>
                      <td className="font-medium">
                        {i.medication}
                        {i.instructions && <div className="text-xs font-normal text-muted-foreground">{i.instructions}</div>}
                      </td>
                      <td>{i.dosage}</td>
                      <td>{i.frequency}</td>
                      <td className="whitespace-nowrap">{i.duration_days} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {p.notes && <p className="border-t px-4 py-2 text-sm text-muted-foreground">{p.notes}</p>}
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function LabList({
  labs,
  showPatient = false,
  children,
}: {
  labs: LabReport[];
  showPatient?: boolean;
  children?: (lab: LabReport) => React.ReactNode;
}) {
  if (!labs.length) return <EmptyState icon={<FlaskConical className="h-6 w-6" />} title="No lab reports yet" />;
  return (
    <Card>
      <ul className="divide-y">
        {labs.map((l) => (
          <li key={l.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{l.test_name}</p>
                <StatusBadge status={l.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {showPatient && <span className="font-medium text-foreground">{l.patient_name} · </span>}
                Requested by {l.doctor_name} · {fmtDate(l.requested_at)}
                {l.status === "completed" && l.completed_at && ` · Verified ${fmtDate(l.completed_at)}`}
              </p>
              {l.result_summary ? (
                <p className="mt-1 whitespace-pre-line text-sm">{l.result_summary}</p>
              ) : (
                l.status !== "completed" && <p className="mt-1 text-xs text-muted-foreground">Results appear here once the laboratory verifies them.</p>
              )}
              {l.amended_at && <p className="mt-1 text-xs text-muted-foreground">Amended {fmtDate(l.amended_at)}: {l.amendment_reason}</p>}
            </div>
            {l.has_file && (
              <a href={`/api/labs/${l.id}/file`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                <Download className="h-4 w-4" /> {l.file_name || "Report"}
              </a>
            )}
            {children?.(l)}
          </li>
        ))}
      </ul>
    </Card>
  );
}
