"use client";

import { ConfirmButton } from "@/components/confirm-button";
import { api } from "@/lib/api";

export function CancelButton({ id }: { id: number }) {
  return (
    <ConfirmButton
      variant="ghost"
      size="sm"
      className="text-destructive hover:bg-destructive/10"
      title="Cancel this appointment?"
      description="The time slot will be released and your doctor will be notified. This can't be undone."
      confirmLabel="Cancel appointment"
      success="Appointment cancelled"
      action={() => api(`/appointments/${id}/cancel`, { method: "POST" })}
    >
      Cancel
    </ConfirmButton>
  );
}
