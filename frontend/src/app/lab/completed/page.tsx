import type { Metadata } from "next";

import { FilterForm } from "@/components/filter-form";
import { Pagination } from "@/components/pagination";
import { buttonClass, Card, Input, PageHeader } from "@/components/ui";
import { qs, serverApi } from "@/lib/server-api";
import type { LabReport, Page } from "@/types/api";

import { OrdersTable } from "../orders-table";

export const metadata: Metadata = { title: "Verified results" };

export default async function LabCompleted({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const data = await serverApi<Page<LabReport>>(`/lab/orders${qs({ scope: "done", q: searchParams.q, page })}`);
  return (
    <>
      <PageHeader title="Verified results" description="Results you have verified. Open one to record an amendment if a correction is needed." />
      <FilterForm className="mb-4 flex gap-2">
        <label htmlFor="q" className="sr-only">Search results</label>
        <Input id="q" name="q" defaultValue={searchParams.q} placeholder="Patient or test" className="sm:max-w-xs" />
        <button type="submit" className={buttonClass("outline")}>Search</button>
      </FilterForm>
      <Card>
        <OrdersTable items={data.items} mode="done" />
        <Pagination page={data.page} size={data.size} total={data.total} basePath="/lab/completed" params={{ q: searchParams.q }} />
      </Card>
    </>
  );
}
