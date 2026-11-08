"use client";

import { useState } from "react";

import { Alert, Button, Field, Input } from "@/components/ui";
import { api } from "@/lib/api";
import type { Me } from "@/types/api";

function safeNext(role: string): string {
  const next = new URLSearchParams(window.location.search).get("next");
  // Only same-site, same-role paths (prevents open redirects).
  return next && next.startsWith(`/${role}`) && !next.startsWith("//") ? next : `/${role}`;
}

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const me = await api<Me>("/auth/login", { json: { email: f.get("email"), password: f.get("password") } });
      window.location.href = safeNext(me.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert>{error}</Alert>}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" className="w-full" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}
