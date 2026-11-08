import type { Metadata } from "next";

import { AvailabilityEditor } from "@/components/availability-editor";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { serverApi } from "@/lib/server-api";
import type { AvailabilityWindow } from "@/types/api";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const windows = await serverApi<AvailabilityWindow[]>("/doctor/availability");
  return (
    <>
      <PageHeader title="Availability" description="Set your weekly consulting hours. Patients book from these slots." />
      <Card className="max-w-3xl">
        <CardBody>
          <AvailabilityEditor initial={windows} endpoint="/doctor/availability" />
        </CardBody>
      </Card>
    </>
  );
}
