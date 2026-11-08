"use client";

import Link from "next/link";
import { useState } from "react";

import { Alert, Button, Card, CardBody, Field, Input, Select } from "@/components/ui";
import { api } from "@/lib/api";

export default function RegisterPatientPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (f.password !== f.confirm) return setError("Passwords do not match");
    setPending(true);
    setError(null);
    try {
      await api("/auth/register/patient", {
        json: {
          email: f.email,
          password: f.password,
          full_name: f.full_name,
          phone: f.phone || null,
          date_of_birth: f.date_of_birth || null,
          gender: f.gender || null,
        },
      });
      window.location.href = "/patient";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setPending(false);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-5">
        <div>
          <h1>Create patient account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Doctor? <Link href="/register/doctor" className="font-medium text-primary hover:underline">Apply here</Link>.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Full name" htmlFor="full_name">
            <Input id="full_name" name="full_name" required minLength={2} maxLength={120} autoComplete="name" />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone (optional)" htmlFor="phone">
              <Input id="phone" name="phone" type="tel" autoComplete="tel" pattern="^\+?[0-9 \-]{7,20}$" />
            </Field>
            <Field label="Date of birth" htmlFor="date_of_birth">
              <Input id="date_of_birth" name="date_of_birth" type="date" />
            </Field>
          </div>
          <Field label="Gender (optional)" htmlFor="gender">
            <Select id="gender" name="gender" defaultValue="">
              <option value="">Prefer not to say</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </Select>
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 10 characters with letters and numbers.">
            <Input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" />
          </Field>
          <Field label="Confirm password" htmlFor="confirm">
            <Input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" />
          </Field>
          <Button type="submit" className="w-full" loading={pending}>
            Create account
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already registered? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </CardBody>
    </Card>
  );
}
