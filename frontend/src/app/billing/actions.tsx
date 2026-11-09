"use client";

import { ConfirmButton, FormDialogButton } from "@/components/confirm-button";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import type { BillingPatient, Claim, FulfilmentStatus } from "@/types/api";

const str = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v || null;
};

/** Accepts "PT-000123" or "123". */
function patientIdFrom(v: string | null): number {
  const n = Number((v ?? "").toUpperCase().replace(/^PT-/, ""));
  if (!Number.isInteger(n) || n <= 0) throw new Error("Enter a Patient ID such as PT-000012");
  return n;
}

export function NewInvoiceButton() {
  return (
    <FormDialogButton
      variant="action"
      title="New invoice"
      description="For services not invoiced automatically. Consultation invoices are created when a visit is completed."
      submitLabel="Issue invoice"
      success="Invoice issued"
      onSubmit={(f) =>
        api("/billing/invoices", {
          json: { patient_id: patientIdFrom(str(f, "patient")), description: str(f, "description"), amount: str(f, "amount") },
        })
      }
      fields={
        <>
          <Field label="Patient ID" htmlFor="n-patient" hint="Find it under Patients & insurance.">
            <Input id="n-patient" name="patient" required placeholder="PT-000012" />
          </Field>
          <Field label="Description" htmlFor="n-desc">
            <Input id="n-desc" name="description" required minLength={3} maxLength={300} />
          </Field>
          <Field label="Amount (₹)" htmlFor="n-amount">
            <Input id="n-amount" name="amount" type="number" required min="1" step="0.01" className="tabular-nums" />
          </Field>
        </>
      }
    >
      New invoice
    </FormDialogButton>
  );
}

export function InvoiceActions({ id, amount }: { id: number; amount: string }) {
  return (
    <div className="flex justify-end gap-2">
      <FormDialogButton
        size="sm"
        variant="outline"
        title={`Record payment for invoice #${id}`}
        description={`${amount}. Paid invoices are final and can't be edited.`}
        submitLabel="Record payment"
        success="Payment recorded"
        onSubmit={(f) => api(`/billing/invoices/${id}/pay`, { json: { method: str(f, "method"), reference: str(f, "reference") } })}
        fields={
          <>
            <Field label="Method" htmlFor={`m-${id}`}>
              <Select id={`m-${id}`} name="method" required defaultValue="upi">
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="insurance">Insurance settlement</option>
              </Select>
            </Field>
            <Field label="Reference (optional)" htmlFor={`r-${id}`} hint="Transaction or receipt number.">
              <Input id={`r-${id}`} name="reference" maxLength={80} />
            </Field>
          </>
        }
      >
        Record payment
      </FormDialogButton>
      <FormDialogButton
        size="sm"
        variant="ghost"
        title={`Void invoice #${id}?`}
        description="A voided invoice can't be paid or reopened. The reason is kept in the audit log."
        submitLabel="Void invoice"
        success="Invoice voided"
        onSubmit={(f) => api(`/billing/invoices/${id}/void`, { json: { reason: str(f, "reason") } })}
        fields={
          <Field label="Reason" htmlFor={`v-${id}`}>
            <Input id={`v-${id}`} name="reason" required minLength={5} maxLength={300} />
          </Field>
        }
      >
        Void
      </FormDialogButton>
    </div>
  );
}

export function FileClaimButton({ invoiceId, amount }: { invoiceId: number; amount: string }) {
  return (
    <FormDialogButton
      size="sm"
      variant="ghost"
      title={`File insurance claim for invoice #${invoiceId}`}
      description="Uses the patient's verified insurer and policy number."
      submitLabel="File claim"
      success="Claim filed"
      onSubmit={(f) => api("/billing/claims", { json: { invoice_id: invoiceId, amount_claimed: str(f, "amount") } })}
      fields={
        <Field label="Amount claimed (₹)" htmlFor={`c-${invoiceId}`}>
          <Input id={`c-${invoiceId}`} name="amount" type="number" required min="1" max={amount} step="0.01" defaultValue={amount} className="tabular-nums" />
        </Field>
      }
    >
      File claim
    </FormDialogButton>
  );
}

export function InsuranceButton({ p }: { p: BillingPatient }) {
  return (
    <FormDialogButton
      size="sm"
      variant="outline"
      title={`Insurance for ${p.full_name}`}
      description={`${p.patient_code}. The patient is notified when the status changes.`}
      success="Insurance updated"
      onSubmit={(f) =>
        api(`/billing/patients/${p.id}/insurance`, {
          method: "PUT",
          json: { insurer: str(f, "insurer"), policy_number: str(f, "policy"), status: str(f, "status") },
        })
      }
      fields={
        <>
          <Field label="Insurer" htmlFor={`i-${p.id}`}>
            <Input id={`i-${p.id}`} name="insurer" maxLength={120} defaultValue={p.insurer ?? ""} />
          </Field>
          <Field label="Policy number" htmlFor={`pn-${p.id}`}>
            <Input id={`pn-${p.id}`} name="policy" maxLength={60} defaultValue={p.policy_number ?? ""} />
          </Field>
          <Field label="Verification" htmlFor={`s-${p.id}`}>
            <Select id={`s-${p.id}`} name="status" defaultValue={p.insurance_status}>
              <option value="unverified">Unverified</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </Select>
          </Field>
        </>
      }
    >
      Edit insurance
    </FormDialogButton>
  );
}

export function ClaimActions({ c }: { c: Claim }) {
  const patch = (json: object) => api(`/billing/claims/${c.id}`, { method: "PATCH", json });
  if (c.status === "approved")
    return (
      <ConfirmButton
        size="sm"
        variant="outline"
        tone="default"
        title={`Mark claim #${c.id} as settled?`}
        description="Settled claims are final."
        confirmLabel="Mark settled"
        success="Claim settled"
        action={() => patch({ status: "settled" })}
      >
        Mark settled
      </ConfirmButton>
    );
  if (c.status !== "submitted") return null;
  return (
    <div className="flex justify-end gap-2">
      <FormDialogButton
        size="sm"
        variant="outline"
        title={`Approve claim #${c.id}`}
        submitLabel="Approve"
        success="Claim approved"
        onSubmit={(f) => patch({ status: "approved", amount_approved: str(f, "amount"), note: str(f, "note") })}
        fields={
          <>
            <Field label="Approved amount (₹)" htmlFor={`a-${c.id}`}>
              <Input id={`a-${c.id}`} name="amount" type="number" required min="0" max={c.amount_claimed} step="0.01" defaultValue={c.amount_claimed} className="tabular-nums" />
            </Field>
            <Field label="Note (optional)" htmlFor={`an-${c.id}`}>
              <Input id={`an-${c.id}`} name="note" maxLength={300} />
            </Field>
          </>
        }
      >
        Approve
      </FormDialogButton>
      <FormDialogButton
        size="sm"
        variant="ghost"
        title={`Reject claim #${c.id}`}
        submitLabel="Reject claim"
        success="Claim rejected"
        onSubmit={(f) => patch({ status: "rejected", note: str(f, "note") })}
        fields={
          <Field label="Insurer's reason" htmlFor={`rn-${c.id}`}>
            <Textarea id={`rn-${c.id}`} name="note" required maxLength={300} rows={2} />
          </Field>
        }
      >
        Reject
      </FormDialogButton>
    </div>
  );
}

const NEXT: Record<FulfilmentStatus, { to: FulfilmentStatus; label: string }[]> = {
  pending: [
    { to: "ready", label: "Ready" },
    { to: "dispensed", label: "Dispensed" },
    { to: "unavailable", label: "Out of stock" },
  ],
  unavailable: [
    { to: "ready", label: "Ready" },
    { to: "pending", label: "Back to pending" },
  ],
  ready: [
    { to: "dispensed", label: "Dispensed" },
    { to: "unavailable", label: "Out of stock" },
  ],
  dispensed: [],
};

export function FulfilmentActions({ id, status }: { id: number; status: FulfilmentStatus }) {
  const { run, pending } = useAction();
  if (!NEXT[status].length) return null;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {NEXT[status].map((n) => (
        <Button
          key={n.to}
          size="sm"
          variant={n.to === "dispensed" || n.to === "ready" ? "outline" : "ghost"}
          disabled={pending}
          onClick={() => run(() => api(`/billing/prescriptions/${id}/fulfilment`, { method: "PATCH", json: { status: n.to } }), { success: `Marked ${n.label.toLowerCase()}` })}
        >
          {n.label}
        </Button>
      ))}
    </div>
  );
}
