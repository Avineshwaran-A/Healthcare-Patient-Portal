import type { Metadata } from "next";

import { LabList, PrescriptionList, RecordList } from "@/components/clinical";
import { Tabs } from "@/components/tabs";
import { PageHeader } from "@/components/ui";
import { serverApi } from "@/lib/server-api";
import type { PatientHistory } from "@/types/api";

export const metadata: Metadata = { title: "Health records" };

export default async function RecordsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = ["prescriptions", "labs"].includes(searchParams.tab ?? "") ? searchParams.tab! : "notes";
  const h = await serverApi<PatientHistory>("/patients/me/history");

  return (
    <>
      <PageHeader
        title="Health records"
        description="Notes and prescriptions written by your doctors, and your lab reports."
      />
      <Tabs
        basePath="/patient/records"
        current={tab}
        tabs={[
          { value: "notes", label: `Consultations (${h.records.length})` },
          { value: "prescriptions", label: `Prescriptions (${h.prescriptions.length})` },
          { value: "labs", label: `Lab reports (${h.labs.length})` },
        ]}
      />
      {tab === "notes" && <RecordList records={h.records} />}
      {tab === "prescriptions" && <PrescriptionList prescriptions={h.prescriptions} />}
      {tab === "labs" && <LabList labs={h.labs} />}
    </>
  );
}
