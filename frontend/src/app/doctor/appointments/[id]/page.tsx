import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { LabList, PrescriptionList, RecordList } from "@/components/clinical";
import { Tabs } from "@/components/tabs";
import { Alert, Card, CardBody, CardHeader, StatusBadge } from "@/components/ui";
import { serverApi } from "@/lib/server-api";
import { fmtDate, fmtDateTime, fmtTime } from "@/lib/utils";
import type { Appointment, PatientHistory } from "@/types/api";

import { ConsultationForm } from "./consultation-form";
import { StatusActions } from "./status-actions";

function age(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  const n = new Date();
  return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
}

export default async function DoctorAppointmentPage({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) {
  const appt = await serverApi<Appointment>(`/appointments/${Number(params.id)}`);
  // Access is audited server-side and only allowed with a treatment relationship.
  const h = await serverApi<PatientHistory>(`/doctor/patients/${appt.patient.id}/history`);
  const p = h.patient;
  const tab = ["prescriptions", "labs"].includes(searchParams.tab ?? "") ? searchParams.tab! : "notes";
  const visitDay = appt.start_at.slice(0, 10);
  const todayStr = new Date().toLocaleDateString("en-CA");
  const canDocument = !appt.has_record && ["scheduled", "confirmed", "completed"].includes(appt.status) && visitDay <= todayStr;

  return (
    <>
      <Link href="/doctor/appointments" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Schedule
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader title="Appointment" action={<StatusBadge status={appt.status} />} />
            <CardBody className="space-y-3 text-sm">
              <p>
                <span className="font-medium">{fmtDateTime(appt.start_at)}</span> – {fmtTime(appt.end_at)}
              </p>
              <p className="text-muted-foreground">{appt.reason || "No reason given"}</p>
              <StatusActions id={appt.id} status={appt.status} isPastOrToday={visitDay <= todayStr} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={p.full_name} description={p.email} />
            <CardBody>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground">Age</dt><dd>{age(p.date_of_birth) ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Gender</dt><dd>{p.gender || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Blood group</dt><dd>{p.blood_group || "—"}</dd></div>
                <div><dt className="text-muted-foreground">DOB</dt><dd>{fmtDate(p.date_of_birth)}</dd></div>
                <div className="col-span-2"><dt className="text-muted-foreground">Phone</dt><dd>{p.phone || "—"}</dd></div>
              </dl>
              {p.allergies && (
                <div className="mt-4 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  <span><span className="font-medium">Allergies:</span> {p.allergies}</span>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Consultation" />
            <CardBody>
              {appt.has_record ? (
                <Alert tone="success">Consultation notes have been recorded for this appointment.</Alert>
              ) : canDocument ? (
                <ConsultationForm appointmentId={appt.id} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {appt.status === "cancelled" || appt.status === "no_show"
                    ? "This appointment was not attended."
                    : "Notes can be added on the day of the visit."}
                </p>
              )}
            </CardBody>
          </Card>

          <section aria-labelledby="hist">
            <h2 id="hist" className="mb-2">Patient history</h2>
            <Tabs
              basePath={`/doctor/appointments/${appt.id}`}
              current={tab}
              tabs={[
                { value: "notes", label: `Notes (${h.records.length})` },
                { value: "prescriptions", label: `Prescriptions (${h.prescriptions.length})` },
                { value: "labs", label: `Labs (${h.labs.length})` },
              ]}
            />
            {tab === "notes" && <RecordList records={h.records} />}
            {tab === "prescriptions" && <PrescriptionList prescriptions={h.prescriptions} />}
            {tab === "labs" && <LabList labs={h.labs} />}
          </section>
        </div>
      </div>
    </>
  );
}
