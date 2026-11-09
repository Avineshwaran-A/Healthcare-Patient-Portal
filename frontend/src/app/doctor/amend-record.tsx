"use client";

import { FormDialogButton } from "@/components/confirm-button";
import { Field, Input, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import type { MedicalRecord } from "@/types/api";

/** Author-only amendment of a consultation note. The reason is stored and the change is audited. */
export function AmendRecordButton({ record: r }: { record: MedicalRecord }) {
  const val = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null;
  return (
    <FormDialogButton
      size="sm"
      variant="ghost"
      title="Amend consultation note"
      description="Only you can amend your own notes. The original time and your reason are kept on record."
      submitLabel="Save amendment"
      success="Note amended"
      onSubmit={(f) =>
        api(`/doctor/records/${r.id}`, {
          method: "PUT",
          json: {
            chief_complaint: val(f, "chief_complaint"),
            assessment: val(f, "assessment"),
            notes: val(f, "notes"),
            follow_up_date: val(f, "follow_up_date"),
            reason: val(f, "reason"),
          },
        })
      }
      fields={
        <>
          <Field label="Chief complaint" htmlFor={`cc-${r.id}`}>
            <Input id={`cc-${r.id}`} name="chief_complaint" maxLength={500} defaultValue={r.chief_complaint ?? ""} />
          </Field>
          <Field label="Assessment" htmlFor={`as-${r.id}`}>
            <Textarea id={`as-${r.id}`} name="assessment" maxLength={5000} rows={2} defaultValue={r.assessment ?? ""} />
          </Field>
          <Field label="Clinical notes" htmlFor={`no-${r.id}`}>
            <Textarea id={`no-${r.id}`} name="notes" required maxLength={10000} rows={4} defaultValue={r.notes} />
          </Field>
          <Field label="Follow-up date" htmlFor={`fu-${r.id}`}>
            <Input id={`fu-${r.id}`} name="follow_up_date" type="date" defaultValue={r.follow_up_date ?? ""} />
          </Field>
          <Field label="Reason for amendment" htmlFor={`re-${r.id}`}>
            <Input id={`re-${r.id}`} name="reason" required minLength={5} maxLength={300} />
          </Field>
        </>
      }
    >
      Amend
    </FormDialogButton>
  );
}
