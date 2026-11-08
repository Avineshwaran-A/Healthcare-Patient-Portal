"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import type { RxItem } from "@/types/api";

const blank = (): RxItem => ({ medication: "", dosage: "", frequency: "", duration_days: 5, instructions: "" });

export function ConsultationForm({ appointmentId }: { appointmentId: number }) {
  const { run, pending, error } = useAction();
  const [items, setItems] = useState<RxItem[]>([]);
  const [labs, setLabs] = useState("");

  const update = (i: number, patch: Partial<RxItem>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    await run(() =>
      api(`/doctor/appointments/${appointmentId}/consultation`, {
        json: {
          chief_complaint: f.chief_complaint || null,
          assessment: f.assessment || null,
          notes: f.notes,
          prescription_notes: f.prescription_notes || null,
          prescription_items: items
            .filter((i) => i.medication.trim())
            .map((i) => ({ ...i, instructions: i.instructions?.trim() || null, duration_days: Number(i.duration_days) })),
          lab_tests: labs.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
          mark_completed: f.mark_completed === "on",
        },
      }),
      { success: "Consultation saved", toastError: false },
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <Field label="Chief complaint" htmlFor="chief_complaint">
        <Input id="chief_complaint" name="chief_complaint" maxLength={500} />
      </Field>
      <Field label="Clinical notes" htmlFor="notes">
        <Textarea id="notes" name="notes" required maxLength={10000} rows={4} />
      </Field>
      <Field label="Assessment (doctor's own)" htmlFor="assessment">
        <Textarea id="assessment" name="assessment" maxLength={5000} rows={2} />
      </Field>

      <fieldset className="rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">Prescription</legend>
        {items.length === 0 && <p className="mb-2 text-sm text-muted-foreground">No medicines added.</p>}
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid gap-2 rounded-md bg-muted/50 p-2 sm:grid-cols-12">
              <Input aria-label="Medication" placeholder="Medication" className="sm:col-span-4" required value={it.medication} onChange={(e) => update(i, { medication: e.target.value })} maxLength={150} />
              <Input aria-label="Dosage" placeholder="Dosage" className="sm:col-span-2" required value={it.dosage} onChange={(e) => update(i, { dosage: e.target.value })} maxLength={80} />
              <Input aria-label="Frequency" placeholder="Frequency" className="sm:col-span-3" required value={it.frequency} onChange={(e) => update(i, { frequency: e.target.value })} maxLength={80} />
              <Input aria-label="Days" type="number" min={1} max={365} className="sm:col-span-2" required value={it.duration_days} onChange={(e) => update(i, { duration_days: Number(e.target.value) })} />
              <Button type="button" variant="ghost" size="icon" className="sm:col-span-1" aria-label="Remove medicine" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Input aria-label="Instructions" placeholder="Instructions (optional)" className="sm:col-span-12" value={it.instructions ?? ""} onChange={(e) => update(i, { instructions: e.target.value })} maxLength={300} />
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setItems((xs) => [...xs, blank()])} disabled={items.length >= 20}>
          <Plus className="h-4 w-4" /> Add medicine
        </Button>
        {items.length > 0 && (
          <div className="mt-3">
            <Field label="Prescription notes" htmlFor="prescription_notes">
              <Input id="prescription_notes" name="prescription_notes" maxLength={1000} />
            </Field>
          </div>
        )}
      </fieldset>

      <Field label="Request lab tests" htmlFor="labs" hint="One per line or comma-separated, e.g. CBC, Lipid profile">
        <Textarea id="labs" value={labs} onChange={(e) => setLabs(e.target.value)} rows={2} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="mark_completed" defaultChecked className="h-4 w-4 accent-[hsl(var(--primary))]" />
        Mark appointment as completed (issues the invoice)
      </label>
      <Button type="submit" loading={pending}>
        Save consultation
      </Button>
    </form>
  );
}
