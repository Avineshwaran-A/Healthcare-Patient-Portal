"use client";

import { useState } from "react";

import { Button, Input, Textarea } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";

const MAX = 5 * 1024 * 1024;

export function LabResultForm({ labId }: { labId: number }) {
  const [open, setOpen] = useState(false);
  const { run, pending, error, setError } = useAction();

  if (!open)
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Add result
      </Button>
    );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file") as File | null;
    if (file && file.size > MAX) return setError("File exceeds 5 MB");
    if (file && !file.size) form.delete("file");
    await run(() => api(`/doctor/labs/${labId}/result`, { form }), { success: "Lab result saved — patient notified", toastError: false });
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-2 rounded-md border bg-muted/40 p-3">
      <label htmlFor={`s-${labId}`} className="text-sm font-medium">Result summary</label>
      <Textarea id={`s-${labId}`} name="summary" required maxLength={5000} rows={2} />
      <label htmlFor={`f-${labId}`} className="block text-sm font-medium">Report file (PDF, PNG or JPEG, max 5 MB)</label>
      <Input id={`f-${labId}`} name="file" type="file" accept="application/pdf,image/png,image/jpeg" className="h-auto py-1.5" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={pending}>Save result</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
