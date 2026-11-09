import type { Metadata } from "next";

import { Alert, Card, CardBody, PageHeader } from "@/components/ui";

import { EmergencyAccess } from "./emergency-access";

export const metadata: Metadata = { title: "Emergency access" };

export default function EmergencyPage() {
  return (
    <>
      <PageHeader title="Emergency record access" description="For a patient you have no appointment with, when their history is needed to treat them safely." />
      <div className="max-w-3xl space-y-4">
        <Alert tone="info">
          Each use is recorded with your reason in the audit log and sent to administrators for review. Access covers this one view only.
        </Alert>
        <Card>
          <CardBody>
            <EmergencyAccess />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
