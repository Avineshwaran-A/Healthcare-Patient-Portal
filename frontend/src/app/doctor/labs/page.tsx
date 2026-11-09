import type { Metadata } from "next";

import { LabList } from "@/components/clinical";
import { Tabs } from "@/components/tabs";
import { PageHeader } from "@/components/ui";
import { serverApi } from "@/lib/server-api";
import type { LabReport } from "@/types/api";

export const metadata: Metadata = { title: "Lab results" };

export default async function DoctorLabs({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = searchParams.tab === "completed" ? "completed" : "pending";
  const labs = await serverApi<LabReport[]>(`/doctor/labs?status=${tab}`);
  return (
    <>
      <PageHeader
        title="Lab results"
        description="Tests you requested. The laboratory enters and verifies results; you are notified when one is released."
      />
      <Tabs
        basePath="/doctor/labs"
        current={tab}
        tabs={[
          { value: "pending", label: "In the lab" },
          { value: "completed", label: "Verified" },
        ]}
      />
      <LabList labs={labs} showPatient />
    </>
  );
}
