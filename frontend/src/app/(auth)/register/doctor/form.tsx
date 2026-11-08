"use client";

import { useState } from "react";

import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { api } from "@/lib/api";
import type { Department } from "@/types/api";

export function DoctorRegisterForm({ departments }: { departments: Department[] }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setPending(true);
    setError(null);
    try {
      const r = await api<{ detail: string }>("/auth/register/doctor", {
        json: {
          email: f.email,
          password: f.password,
          full_name: f.full_name,
          phone: f.phone || null,
          department_id: f.department_id ? Number(f.department_id) : null,
          specialty: f.specialty,
          qualifications: f.qualifications,
          registration_number: f.registration_number,
          experience_years: Number(f.experience_years || 0),
        },
      });
      setDone(r.detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setPending(false);
    }
  }

  if (done) return <Alert tone="success">{done}</Alert>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <Field label="Full name" htmlFor="full_name">
        <Input id="full_name" name="full_name" required minLength={2} placeholder="Dr. Firstname Lastname" />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Department" htmlFor="department_id">
          <Select id="department_id" name="department_id" defaultValue="">
            <option value="">Select…</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Specialty" htmlFor="specialty">
          <Input id="specialty" name="specialty" required minLength={2} />
        </Field>
      </div>
      <Field label="Qualifications" htmlFor="qualifications">
        <Input id="qualifications" name="qualifications" required placeholder="MBBS, MD" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Medical registration no." htmlFor="registration_number">
          <Input id="registration_number" name="registration_number" required minLength={3} />
        </Field>
        <Field label="Years of experience" htmlFor="experience_years">
          <Input id="experience_years" name="experience_years" type="number" min={0} max={70} defaultValue={0} />
        </Field>
      </div>
      <Field label="Phone (optional)" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 10 characters with letters and numbers.">
        <Input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" />
      </Field>
      <Button type="submit" className="w-full" loading={pending}>
        Submit for approval
      </Button>
    </form>
  );
}
