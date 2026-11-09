"use client";

import { useState } from "react";

import { LabList, PrescriptionList, RecordList } from "@/components/clinical";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import type { PatientHistory } from "@/types/api";

export function EmergencyAccess() {
  const { run, pending, error } = useAction();
  const [h, setH] = useState<PatientHistory | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const id = Number(String(f.get("patient")).trim().toUpperCase().replace(/^PT-/, ""));
    const res = await run(
      () => {
        if (!Number.isInteger(id) || id <= 0) throw new Error("Enter a Patient ID such as PT-000012");
        return api<PatientHistory>(`/doctor/patients/${id}/emergency-access`, { json: { reason: String(f.get("reason")).trim() } });
      },
      { refresh: false, toastError: false },
    );
    if (res && typeof res === "object") setH(res);
  }

  if (h)
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold">{h.patient.full_name}</p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {h.patient.patient_code}
              {h.patient.blood_group && ` · ${h.patient.blood_group}`}
            </p>
          </div>
          <Button variant="outline" onClick={() => setH(null)}>Close record</Button>
        </div>
        {h.patient.allergies && (
          <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
            <span className="font-medium">Allergies:</span> {h.patient.allergies}
          </p>
        )}
        <section className="space-y-2"><h2>Consultation notes</h2><RecordList records={h.records} /></section>
        <section className="space-y-2"><h2>Prescriptions</h2><PrescriptionList prescriptions={h.prescriptions} /></section>
        <section className="space-y-2"><h2>Lab results</h2><LabList labs={h.labs} /></section>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Patient ID" htmlFor="patient">
        <Input id="patient" name="patient" required placeholder="PT-000012" className="sm:max-w-xs" />
      </Field>
      <Field label="Clinical reason" htmlFor="reason" hint="At least 15 characters. Avoid unnecessary personal details.">
        <Textarea id="reason" name="reason" required minLength={15} maxLength={300} rows={3} />
      </Field>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="destructive" loading={pending}>Open record</Button>
    </form>
  );
}
