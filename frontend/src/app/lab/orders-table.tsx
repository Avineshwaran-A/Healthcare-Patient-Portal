import Link from "next/link";

import { EmptyState, StatusBadge, TableWrap } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import type { LabReport } from "@/types/api";

import { ClaimButton } from "./actions";

export function OrdersTable({ items, mode }: { items: LabReport[]; mode: "queue" | "mine" | "done" }) {
  if (!items.length)
    return <EmptyState title={mode === "queue" ? "No unassigned orders" : mode === "mine" ? "Nothing assigned to you" : "No verified results yet"} />;
  return (
    <TableWrap>
      <table className="table-base">
        <thead>
          <tr>
            <th>Order</th>
            <th>Patient</th>
            <th>Test</th>
            <th>Requested by</th>
            <th>{mode === "done" ? "Verified" : "Requested"}</th>
            <th>Status</th>
            <th className="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((l) => (
            <tr key={l.id}>
              <td className="tabular-nums">#{l.id}</td>
              <td>
                <div className="font-medium">{l.patient_name}</div>
                <div className="text-xs tabular-nums text-muted-foreground">{l.patient_code}</div>
              </td>
              <td className="font-medium">{l.test_name}</td>
              <td className="whitespace-nowrap">{l.doctor_name}</td>
              <td className="whitespace-nowrap">{fmtDate(mode === "done" ? l.completed_at : l.requested_at)}</td>
              <td><StatusBadge status={l.status} /></td>
              <td className="text-right">
                {mode === "queue" ? (
                  <ClaimButton id={l.id} />
                ) : (
                  <Link href={`/lab/orders/${l.id}`} className="text-sm font-medium text-primary hover:underline">
                    Open
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}
