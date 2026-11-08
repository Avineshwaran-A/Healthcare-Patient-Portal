import type { Metadata } from "next";

import { LabList } from "@/components/clinical";
import { Tabs } from "@/components/tabs";
import { PageHeader } from "@/components/ui";
import { serverApi } from "@/lib/server-api";
import type { LabReport } from "@/types/api";

import { LabResultForm } from "./lab-result-form";

export const metadata: Metadata = { title: "Lab requests" };

export default async function DoctorLabs({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = searchParams.tab === "completed" ? "completed" : "requested";
  const labs = await serverApi<LabReport[]>(`/doctor/labs?status=${tab}`);
  return (
    <>
      <PageHeader title="Lab requests" description="Record results for tests you requested. Patients are notified when a result is added." />
      <Tabs
        basePath="/doctor/labs"
        current={tab}
        tabs={[
          { value: "requested", label: "Pending" },
          { value: "completed", label: "Completed" },
        ]}
      />
      <LabList labs={labs} showPatient>{(l) => (l.status === "requested" ? <LabResultForm labId={l.id} /> : null)}</LabList>
    </>
  );
}
