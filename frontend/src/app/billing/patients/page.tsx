import type { Metadata } from "next";

import { FilterForm } from "@/components/filter-form";
import { Pagination } from "@/components/pagination";
import { buttonClass, Card, EmptyState, PageHeader, StatusBadge, TableWrap } from "@/components/ui";
import { qs, serverApi } from "@/lib/server-api";
import type { BillingPatient, Page } from "@/types/api";

import { InsuranceButton } from "../actions";
import { SearchBox } from "../status-chips";

export const metadata: Metadata = { title: "Patients & insurance" };

export default async function BillingPatients({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const data = await serverApi<Page<BillingPatient>>(`/billing/patients${qs({ q: searchParams.q, page })}`);
  return (
    <>
      <PageHeader title="Patients and insurance" description="Identity, contact and insurance details only. Clinical records are not available to billing." />
      <FilterForm className="mb-4 flex gap-2">
        <SearchBox q={searchParams.q} />
        <button type="submit" className={buttonClass("outline")}>Search</button>
      </FilterForm>
      <Card>
        {data.items.length ? (
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Insurer</th>
                  <th>Insurance</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap tabular-nums">{p.patient_code}</td>
                    <td className="whitespace-nowrap font-medium">{p.full_name}</td>
                    <td className="text-xs text-muted-foreground">
                      <div>{p.email}</div>
                      {p.phone && <div className="tabular-nums">{p.phone}</div>}
                    </td>
                    <td>
                      {p.insurer ? (
                        <>
                          <div>{p.insurer}</div>
                          <div className="text-xs tabular-nums text-muted-foreground">{p.policy_number}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">None on file</span>
                      )}
                    </td>
                    <td><StatusBadge status={p.insurance_status} /></td>
                    <td className="text-right"><InsuranceButton p={p} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState title="No patients found" />
        )}
        <Pagination page={data.page} size={data.size} total={data.total} basePath="/billing/patients" params={{ q: searchParams.q }} />
      </Card>
    </>
  );
}
