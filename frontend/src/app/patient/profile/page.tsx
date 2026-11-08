import type { Metadata } from "next";

import { Card, CardBody, PageHeader } from "@/components/ui";
import { serverApi } from "@/lib/server-api";
import type { PatientProfile } from "@/types/api";

import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const profile = await serverApi<PatientProfile>("/patients/me");
  return (
    <>
      <PageHeader title="Profile" description="Keep your contact and health details up to date." />
      <Card className="max-w-3xl">
        <CardBody>
          <ProfileForm profile={profile} />
        </CardBody>
      </Card>
    </>
  );
}
