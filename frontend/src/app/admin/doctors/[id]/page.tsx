import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AvailabilityEditor } from "@/components/availability-editor";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { serverApi } from "@/lib/server-api";
import type { AvailabilityWindow, Department, DoctorDetail } from "@/types/api";

import { DoctorSettingsForm } from "./settings-form";

export default async function AdminDoctorPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [doctor, windows, deps] = await Promise.all([
    serverApi<DoctorDetail>(`/doctors/${id}`),
    serverApi<AvailabilityWindow[]>(`/admin/doctors/${id}/availability`),
    serverApi<Department[]>("/departments"),
  ]);
  return (
    <>
      <Link href="/admin/doctors" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Doctors
      </Link>
      <PageHeader title={doctor.full_name} description={doctor.qualifications} />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 lg:self-start">
          <CardHeader title="Profile" />
          <CardBody>
            <DoctorSettingsForm doctor={doctor} departments={deps} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Weekly availability" />
          <CardBody>
            <AvailabilityEditor initial={windows} endpoint={`/admin/doctors/${id}/availability`} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
