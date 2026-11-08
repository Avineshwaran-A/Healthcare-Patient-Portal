"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { toast } from "@/components/toaster";

interface Options {
  /** Toast shown on success. */
  success?: string;
  /** Re-render Server Component data afterwards (default true). */
  refresh?: boolean;
  /** Show errors as a toast (default true). Inline `error` is always set. */
  toastError?: boolean;
}

/**
 * Runs a mutation, tracks pending/error state, shows a toast and refreshes
 * server-rendered data — so lists update without a client cache or store.
 * `pending` stays true until the refreshed page has rendered.
 */
export function useAction() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, opts: Options = {}): Promise<T | undefined> => {
      setRunning(true);
      setError(null);
      try {
        const result = await fn();
        if (opts.success) toast.success(opts.success);
        if (opts.refresh !== false) startTransition(() => router.refresh());
        return result ?? (true as T);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        setError(msg);
        if (opts.toastError !== false) toast.error("Action failed", msg);
        return undefined;
      } finally {
        setRunning(false);
      }
    },
    [router],
  );

  return { run, pending: running || refreshing, error, setError };
}
