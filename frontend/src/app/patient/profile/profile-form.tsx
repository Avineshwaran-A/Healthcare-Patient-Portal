"use client";

import { useState } from "react";

import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import type { PatientProfile } from "@/types/api";

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function ProfileForm({ profile }: { profile: PatientProfile }) {
  const { run, pending, error } = useAction();
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const nul = (v: string) => (v?.trim() ? v.trim() : null);
    const ok = await run(() =>
      api("/patients/me", {
        method: "PUT",
        json: {
          full_name: f.full_name,
          phone: nul(f.phone),
          date_of_birth: nul(f.date_of_birth),
          gender: nul(f.gender),
          blood_group: nul(f.blood_group),
          address: nul(f.address),
          emergency_contact: nul(f.emergency_contact),
          allergies: nul(f.allergies),
        },
      }),
      { success: "Profile saved", toastError: false },
    );
    if (ok) setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      {saved && <Alert tone="success">Profile saved.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="full_name">
          <Input id="full_name" name="full_name" defaultValue={profile.full_name} required minLength={2} />
        </Field>
        <Field label="Email" htmlFor="email" hint="Contact the hospital to change your email.">
          <Input id="email" value={profile.email} disabled readOnly />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} />
        </Field>
        <Field label="Date of birth" htmlFor="date_of_birth">
          <Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={profile.date_of_birth ?? ""} />
        </Field>
        <Field label="Gender" htmlFor="gender">
          <Select id="gender" name="gender" defaultValue={profile.gender ?? ""}>
            <option value="">Prefer not to say</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </Select>
        </Field>
        <Field label="Blood group" htmlFor="blood_group">
          <Select id="blood_group" name="blood_group" defaultValue={profile.blood_group ?? ""}>
            <option value="">Unknown</option>
            {BLOOD.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Address" htmlFor="address">
        <Input id="address" name="address" defaultValue={profile.address ?? ""} maxLength={300} />
      </Field>
      <Field label="Emergency contact" htmlFor="emergency_contact" hint="Name and phone number">
        <Input id="emergency_contact" name="emergency_contact" defaultValue={profile.emergency_contact ?? ""} maxLength={120} />
      </Field>
      <Field label="Known allergies" htmlFor="allergies">
        <Textarea id="allergies" name="allergies" defaultValue={profile.allergies ?? ""} maxLength={500} rows={2} />
      </Field>
      <Button type="submit" loading={pending}>
        Save changes
      </Button>
    </form>
  );
}
