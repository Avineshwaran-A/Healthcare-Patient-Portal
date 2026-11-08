"use client";

import { Check, Ban, RotateCcw } from "lucide-react";

import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import type { AppointmentStatus } from "@/types/api";

export function ApproveButton({ doctorId }: { doctorId: number }) {
  const { run, pending } = useAction();
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={() => run(() => api(`/admin/doctors/${doctorId}/approve`, { method: "POST" }), { success: "Doctor approved" })}
    >
      <Check className="h-3.5 w-3.5" /> Approve
    </Button>
  );
}

export function ToggleUserButton({ userId, active, name }: { userId: number; active: boolean; name?: string }) {
  const { run, pending } = useAction();
  const action = () => api(`/admin/users/${userId}`, { method: "PATCH", json: { is_active: !active } });
  if (!active) {
    return (
      <Button size="sm" variant="outline" loading={pending} onClick={() => run(action, { success: "Account enabled" })}>
        <RotateCcw className="h-3.5 w-3.5" /> Enable
      </Button>
    );
  }
  return (
    <ConfirmButton
      size="sm"
      variant="ghost"
      className="text-destructive hover:bg-destructive/10"
      title={`Disable ${name ?? "this account"}?`}
      description="They will be signed out immediately and won't be able to log in until re-enabled. Their records are kept."
      confirmLabel="Disable account"
      success="Account disabled"
      action={action}
    >
      <Ban className="h-3.5 w-3.5" /> Disable
    </ConfirmButton>
  );
}

export function InvoiceActions({ id, amount }: { id: number; amount: string }) {
  return (
    <div className="flex justify-end gap-2">
      <ConfirmButton
        size="sm"
        variant="outline"
        tone="default"
        title={`Record payment for invoice #${id}?`}
        description={`Marks ${amount} as received at the billing desk. The patient will be notified.`}
        confirmLabel="Mark as paid"
        success="Payment recorded"
        action={() => api(`/admin/invoices/${id}`, { method: "PATCH", json: { status: "paid" } })}
      >
        Mark paid
      </ConfirmButton>
      <ConfirmButton
        size="sm"
        variant="ghost"
        title={`Void invoice #${id}?`}
        description="A voided invoice can't be paid or reopened."
        confirmLabel="Void invoice"
        success="Invoice voided"
        action={() => api(`/admin/invoices/${id}`, { method: "PATCH", json: { status: "void" } })}
      >
        Void
      </ConfirmButton>
    </div>
  );
}

export function AdminCancelAppointment({ id, status }: { id: number; status: AppointmentStatus }) {
  if (status !== "scheduled" && status !== "confirmed") return null;
  return (
    <ConfirmButton
      size="sm"
      variant="ghost"
      className="text-destructive hover:bg-destructive/10"
      title="Cancel this appointment?"
      description="The patient will be notified and the slot released."
      confirmLabel="Cancel appointment"
      success="Appointment cancelled"
      action={() => api(`/appointments/${id}/status`, { method: "PATCH", json: { status: "cancelled" } })}
    >
      Cancel
    </ConfirmButton>
  );
}
