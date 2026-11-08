"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { ConfirmButton } from "@/components/confirm-button";
import { Alert, Button, Input } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import type { Department } from "@/types/api";

export function DepartmentManager({ departments }: { departments: Department[] }) {
  const { run, pending, error } = useAction();
  const [editing, setEditing] = useState<number | null>(null);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const ok = await run(() => api("/admin/departments", { json: { name: f.name, description: f.description || null } }), {
      success: `${f.name} added`,
      toastError: false,
    });
    if (ok) form.reset();
  }

  async function save(e: React.FormEvent<HTMLFormElement>, id: number) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const ok = await run(
      () => api(`/admin/departments/${id}`, { method: "PUT", json: { name: f.name, description: f.description || null } }),
      { success: "Department updated", toastError: false },
    );
    if (ok) setEditing(null);
  }

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <ul className="divide-y rounded-md border">
        {departments.map((d) =>
          editing === d.id ? (
            <li key={d.id} className="p-3">
              <form onSubmit={(e) => save(e, d.id)} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <Input name="name" defaultValue={d.name} required minLength={2} maxLength={80} aria-label="Name" />
                <Input name="description" defaultValue={d.description ?? ""} maxLength={500} aria-label="Description" />
                <div className="flex gap-2">
                  <Button size="sm" type="submit" loading={pending}>Save</Button>
                  <Button size="sm" type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </form>
            </li>
          ) : (
            <li key={d.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{d.name}</p>
                {d.description && <p className="truncate text-sm text-muted-foreground">{d.description}</p>}
              </div>
              <Button size="icon" variant="ghost" aria-label={`Edit ${d.name}`} onClick={() => setEditing(d.id)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <ConfirmButton
                size="icon"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                aria-label={`Delete ${d.name}`}
                title={`Delete ${d.name}?`}
                description="Departments that still have doctors can't be deleted."
                confirmLabel="Delete department"
                success="Department deleted"
                action={() => api(`/admin/departments/${d.id}`, { method: "DELETE" })}
              >
                <Trash2 className="h-4 w-4" />
              </ConfirmButton>
            </li>
          ),
        )}
      </ul>
      <form onSubmit={create} className="grid gap-2 rounded-md border border-dashed p-3 sm:grid-cols-[1fr_2fr_auto]">
        <Input name="name" placeholder="New department" required minLength={2} maxLength={80} aria-label="New department name" />
        <Input name="description" placeholder="Description (optional)" maxLength={500} aria-label="New department description" />
        <Button type="submit" loading={pending}>Add</Button>
      </form>
    </div>
  );
}
