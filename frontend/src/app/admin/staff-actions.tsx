"use client";

import { FormDialogButton } from "@/components/confirm-button";
import { Field, Input, Select } from "@/components/ui";
import { api } from "@/lib/api";
import type { Role } from "@/types/api";

const STAFF_ROLES: { value: Role; label: string }[] = [
  { value: "lab", label: "Lab technician" },
  { value: "billing", label: "Billing & insurance" },
  { value: "admin", label: "Administrator" },
];
const val = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null;

export function AddStaffButton() {
  return (
    <FormDialogButton
      variant="action"
      title="Add staff account"
      description="For lab, billing and admin staff. Doctors register themselves and are approved under Doctors. Share the temporary password privately."
      submitLabel="Create account"
      success="Staff account created"
      onSubmit={(f) =>
        api("/admin/staff", {
          json: { full_name: val(f, "full_name"), email: val(f, "email"), phone: val(f, "phone"), role: val(f, "role"), password: f.get("password") },
        })
      }
      fields={
        <>
          <Field label="Full name" htmlFor="s-name">
            <Input id="s-name" name="full_name" required minLength={2} maxLength={120} />
          </Field>
          <Field label="Email" htmlFor="s-email">
            <Input id="s-email" name="email" type="email" required autoComplete="off" />
          </Field>
          <Field label="Phone (optional)" htmlFor="s-phone">
            <Input id="s-phone" name="phone" type="tel" />
          </Field>
          <Field label="Role" htmlFor="s-role">
            <Select id="s-role" name="role" defaultValue="lab">
              {STAFF_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Temporary password" htmlFor="s-pw" hint="At least 10 characters with letters and numbers.">
            <Input id="s-pw" name="password" type="password" required minLength={10} autoComplete="new-password" />
          </Field>
        </>
      }
    >
      Add staff
    </FormDialogButton>
  );
}

export function ChangeRoleButton({ userId, name, role }: { userId: number; name: string; role: Role }) {
  return (
    <FormDialogButton
      size="sm"
      variant="ghost"
      title={`Change role for ${name}`}
      description="Takes effect on their next request. The change is recorded in the audit log."
      submitLabel="Change role"
      success="Role changed"
      onSubmit={(f) => api(`/admin/users/${userId}/role`, { method: "PATCH", json: { role: val(f, "role") } })}
      fields={
        <Field label="Role" htmlFor={`r-${userId}`}>
          <Select id={`r-${userId}`} name="role" defaultValue={role}>
            {STAFF_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
        </Field>
      }
    >
      Role
    </FormDialogButton>
  );
}
