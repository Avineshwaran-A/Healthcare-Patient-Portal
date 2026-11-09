"use client";

import { useState } from "react";

import { ConfirmButton, FormDialogButton } from "@/components/confirm-button";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import type { LabReport } from "@/types/api";

const MAX = 5 * 1024 * 1024;
const FILE_ACCEPT = "application/pdf,image/png,image/jpeg";

function cleanFile(form: FormData) {
  const file = form.get("file") as File | null;
  if (file && file.size > MAX) throw new Error("File exceeds 5 MB");
  if (file && !file.size) form.delete("file");
  return form;
}

export function ClaimButton({ id, size = "sm" }: { id: number; size?: "sm" | "default" }) {
  const { run, pending } = useAction();
  return (
    <Button size={size} loading={pending} onClick={() => run(() => api(`/lab/orders/${id}/claim`, { method: "POST" }), { success: "Order assigned to you" })}>
      Take order
    </Button>
  );
}

function StepButton({ id, status, label }: { id: number; status: "collected" | "processing"; label: string }) {
  const { run, pending } = useAction();
  return (
    <Button
      variant="outline"
      loading={pending}
      onClick={() => run(() => api(`/lab/orders/${id}/status`, { method: "POST", json: { status } }), { success: `Marked as ${label.toLowerCase()}` })}
    >
      {label}
    </Button>
  );
}

function ResultForm({ lab }: { lab: LabReport }) {
  const { run, pending, error, setError } = useAction();
  const [editing, setEditing] = useState(lab.status !== "resulted");
  if (!editing)
    return (
      <Button variant="outline" onClick={() => setEditing(true)}>
        Edit entry
      </Button>
    );
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    let form: FormData;
    try {
      form = cleanFile(new FormData(e.currentTarget));
    } catch (err) {
      return setError((err as Error).message);
    }
    const ok = await run(() => api(`/lab/orders/${lab.id}/result`, { form }), { success: "Result saved. Verify it to release.", toastError: false });
    if (ok !== undefined) setEditing(false);
  }
  return (
    <form onSubmit={onSubmit} className="w-full space-y-3">
      <Field label="Result and observations" htmlFor="summary">
        <Textarea id="summary" name="summary" required maxLength={5000} rows={4} defaultValue={lab.result_summary ?? ""} />
      </Field>
      <Field label="Report file" htmlFor="file" hint="PDF, PNG or JPEG, up to 5 MB. Replaces any earlier file.">
        <Input id="file" name="file" type="file" accept={FILE_ACCEPT} className="h-auto py-1.5" />
      </Field>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" loading={pending}>Save result</Button>
    </form>
  );
}

/** Next step for an order assigned to this technician. */
export function OrderActions({ lab }: { lab: LabReport }) {
  switch (lab.status) {
    case "requested":
      return <StepButton id={lab.id} status="collected" label="Sample collected" />;
    case "collected":
      return (
        <div className="w-full space-y-4">
          <StepButton id={lab.id} status="processing" label="Start processing" />
          <ResultForm lab={lab} />
        </div>
      );
    case "processing":
      return <ResultForm lab={lab} />;
    case "resulted":
      return (
        <div className="flex flex-wrap gap-2">
          <ConfirmButton
            tone="default"
            title="Verify and release this result?"
            description="The requesting doctor and the patient will be able to see it. After this, changes need a recorded amendment."
            confirmLabel="Verify and release"
            success="Result verified and released"
            action={() => api(`/lab/orders/${lab.id}/verify`, { method: "POST" })}
          >
            Verify result
          </ConfirmButton>
          <ResultForm lab={lab} />
        </div>
      );
    case "completed":
      return (
        <FormDialogButton
          variant="outline"
          title="Amend a verified result"
          description="Amendments are recorded in the audit log, and the doctor and patient are notified."
          submitLabel="Save amendment"
          success="Result amended"
          onSubmit={(form) => api(`/lab/orders/${lab.id}/amend`, { form: cleanFile(form) })}
          fields={
            <>
              <Field label="Corrected result" htmlFor="a-summary">
                <Textarea id="a-summary" name="summary" required maxLength={5000} rows={4} defaultValue={lab.result_summary ?? ""} />
              </Field>
              <Field label="Reason for amendment" htmlFor="a-reason">
                <Input id="a-reason" name="reason" required minLength={5} maxLength={300} />
              </Field>
              <Field label="Replacement file (optional)" htmlFor="a-file">
                <Input id="a-file" name="file" type="file" accept={FILE_ACCEPT} className="h-auto py-1.5" />
              </Field>
            </>
          }
        >
          Amend result
        </FormDialogButton>
      );
  }
}
