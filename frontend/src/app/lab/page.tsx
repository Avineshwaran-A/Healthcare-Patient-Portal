import { ClipboardList, FlaskConical, ShieldCheck, TestTubes } from "lucide-react";
import type { Metadata } from "next";

import { FilterForm } from "@/components/filter-form";
import { Pagination } from "@/components/pagination";
import { Tabs } from "@/components/tabs";
import { buttonClass, Card, Input, PageHeader, StatCard } from "@/components/ui";
import { qs, serverApi } from "@/lib/server-api";
import type { LabReport, LabSummary, Page } from "@/types/api";

import { OrdersTable } from "./orders-table";

export const metadata: Metadata = { title: "Work queue" };

export default async function LabHome({ searchParams }: { searchParams: { tab?: string; q?: string; page?: string } }) {
  const scope = searchParams.tab === "queue" ? "queue" : "mine";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [s, data] = await Promise.all([
    serverApi<LabSummary>("/lab/summary"),
    serverApi<Page<LabReport>>(`/lab/orders${qs({ scope, q: searchParams.q, page })}`),
  ]);
  return (
    <>
      <PageHeader title="Laboratory work queue" description="Take an order, record the sample, enter the result, then verify it to release it to the doctor and patient." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Unassigned orders" value={s.queue} icon={<ClipboardList className="h-5 w-5" />} tone="warning" />
        <StatCard label="Assigned to you" value={s.mine_active} icon={<TestTubes className="h-5 w-5" />} tone="info" />
        <StatCard label="Awaiting verification" value={s.awaiting_verification} icon={<FlaskConical className="h-5 w-5" />} tone="primary" />
        <StatCard label="Verified today" value={s.verified_today} icon={<ShieldCheck className="h-5 w-5" />} tone="success" />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Tabs
          basePath="/lab"
          current={scope}
          tabs={[
            { value: "mine", label: `My orders (${s.mine_active + s.awaiting_verification})` },
            { value: "queue", label: `Unassigned (${s.queue})` },
          ]}
        />
        <FilterForm className="mb-4 flex gap-2">
          <input type="hidden" name="tab" value={scope} />
          <label htmlFor="q" className="sr-only">Search orders</label>
          <Input id="q" name="q" defaultValue={searchParams.q} placeholder="Patient or test" className="w-48" />
          <button type="submit" className={buttonClass("outline")}>Search</button>
        </FilterForm>
      </div>
      <Card>
        <OrdersTable items={data.items} mode={scope} />
        <Pagination page={data.page} size={data.size} total={data.total} basePath="/lab" params={{ tab: scope, q: searchParams.q }} />
      </Card>
    </>
  );
}
