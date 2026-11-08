"use client";

import { AlertTriangle, HelpCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";

import { Button } from "./ui";

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * Button that asks for confirmation in an in-app dialog before running an
 * action. Uses the native <dialog> element (focus trap, Esc, backdrop) instead
 * of window.confirm(), which many browsers and embedded views block.
 */
export function ConfirmButton({
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  action,
  success,
  children,
  ...buttonProps
}: Omit<ButtonProps, "onClick" | "title"> & {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
  action: () => Promise<unknown>;
  success?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const { run, pending, error, setError } = useAction();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  async function confirm() {
    const ok = await run(action, { success, toastError: false });
    if (ok !== undefined) setOpen(false);
  }

  const Icon = tone === "danger" ? AlertTriangle : HelpCircle;

  return (
    <>
      <Button
        type="button"
        {...buttonProps}
        loading={pending && !open}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {children}
      </Button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === ref.current && !pending && setOpen(false)}
        className="dialog-in w-[calc(100%-2rem)] whitespace-normal text-left font-normal normal-case tracking-normal max-w-md rounded-xl border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-slate-950/50"
        aria-labelledby="confirm-title"
      >
        {open && (
          <div className="p-5">
            <div className="flex gap-4">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 id="confirm-title" className="text-base font-semibold">
                  {title}
                </h2>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                {error && (
                  <p role="alert" className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Go back
              </Button>
              <Button type="button" variant={tone === "danger" ? "destructive" : "default"} onClick={confirm} loading={pending} autoFocus>
                {confirmLabel}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
