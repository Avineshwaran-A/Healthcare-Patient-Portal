"use client";

import { useState } from "react";

import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import type { Department, DoctorDetail } from "@/types/api";

export function DoctorSettingsForm({ doctor, departments }: { doctor: DoctorDetail; departments: Department[] }) {
  const { run, pending, error } = useAction();
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const ok = await run(() =>
      api(`/admin/doctors/${doctor.id}`, {
        method: "PATCH",
        json: {
          specialty: f.specialty,
          department_id: f.department_id ? Number(f.department_id) : null,
          consultation_fee: f.consultation_fee,
        },
      }),
      { success: "Doctor profile saved", toastError: false },
    );
    if (ok) setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      {saved && <Alert tone="success">Saved.</Alert>}
      <Field label="Specialty" htmlFor="specialty">
        <Input id="specialty" name="specialty" defaultValue={doctor.specialty} required minLength={2} />
      </Field>
      <Field label="Department" htmlFor="department_id">
        <Select id="department_id" name="department_id" defaultValue={doctor.department?.id ?? ""}>
          <option value="">None</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </Field>
      <Field label="Consultation fee (₹)" htmlFor="consultation_fee">
        <Input id="consultation_fee" name="consultation_fee" type="number" min={0} step="1" defaultValue={Number(doctor.consultation_fee)} required />
      </Field>
      <Button type="submit" loading={pending}>Save</Button>
    </form>
  );
}
