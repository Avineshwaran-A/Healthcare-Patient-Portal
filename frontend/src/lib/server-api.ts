// Server-side only (uses next/headers).
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import type { Me } from "@/types/api";

const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";
export const SESSION_COOKIE = "hcpp_session";

/**
 * Server Component data fetch: forwards the session cookie to FastAPI so pages
 * render with data on the server and ship minimal client JavaScript.
 */
export async function serverApi<T>(path: string): Promise<T> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");
  const res = await fetch(`${BACKEND}/api${path}`, {
    headers: { Cookie: `${SESSION_COOKIE}=${token}` },
    cache: "no-store",
  });
  if (res.status === 401) redirect("/login");
  if (res.status === 403) redirect("/");
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

// Deduplicated per request: layout and pages share one /auth/me call.
export const getMe = cache(async (): Promise<Me | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const res = await fetch(`${BACKEND}/api/auth/me`, {
    headers: { Cookie: `${SESSION_COOKIE}=${token}` },
    cache: "no-store",
  });
  return res.ok ? ((await res.json()) as Me) : null;
});

export async function requireRole(role: Me["role"]): Promise<Me> {
  const me = await getMe();
  if (!me) redirect("/login");
  if (me.role !== role) redirect(`/${me.role}`);
  return me;
}

export function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
