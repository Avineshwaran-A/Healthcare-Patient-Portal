"use client";

import { Check } from "lucide-react";

import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import type { AppointmentStatus } from "@/types/api";

export function StatusActions({ id, status, isPastOrToday }: { id: number; status: AppointmentStatus; isPastOrToday: boolean }) {
  const { run, pending } = useAction();
  if (status !== "scheduled" && status !== "confirmed") return null;
  const set = (s: AppointmentStatus) => () => api(`/appointments/${id}/status`, { method: "PATCH", json: { status: s } });

  return (
    <div className="flex flex-wrap gap-2 border-t pt-3">
      {status === "scheduled" && (
        <Button size="sm" loading={pending} onClick={() => run(set("confirmed"), { success: "Appointment confirmed" })}>
          <Check className="h-3.5 w-3.5" /> Confirm
        </Button>
      )}
      {isPastOrToday && (
        <>
          <ConfirmButton
            size="sm"
            variant="outline"
            tone="default"
            title="Complete without notes?"
            description="Use the consultation form below to record notes and prescriptions. Completing issues the invoice."
            confirmLabel="Mark completed"
            success="Appointment completed"
            action={set("completed")}
          >
            Complete
          </ConfirmButton>
          <ConfirmButton
            size="sm"
            variant="outline"
            tone="default"
            title="Mark as no-show?"
            description="The patient will be notified that the visit was missed."
            confirmLabel="Mark no-show"
            success="Marked as no-show"
            action={set("no_show")}
          >
            No-show
          </ConfirmButton>
        </>
      )}
      <ConfirmButton
        size="sm"
        variant="ghost"
        className="text-destructive hover:bg-destructive/10"
        title="Cancel this appointment?"
        description="The patient will be notified and the slot released."
        confirmLabel="Cancel appointment"
        success="Appointment cancelled"
        action={set("cancelled")}
      >
        Cancel
      </ConfirmButton>
    </div>
  );
}
