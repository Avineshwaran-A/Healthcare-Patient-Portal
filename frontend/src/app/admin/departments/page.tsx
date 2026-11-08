import type { Metadata } from "next";

import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { serverApi } from "@/lib/server-api";
import type { Department } from "@/types/api";

import { DepartmentManager } from "./manager";

export const metadata: Metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const deps = await serverApi<Department[]>("/departments");
  return (
    <>
      <PageHeader title="Departments" description="Departments group doctors and power the patient search filter." />
      <Card className="max-w-3xl">
        <CardHeader title={`${deps.length} departments`} />
        <CardBody>
          <DepartmentManager departments={deps} />
        </CardBody>
      </Card>
    </>
  );
}
