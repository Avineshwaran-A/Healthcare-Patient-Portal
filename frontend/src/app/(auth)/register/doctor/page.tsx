import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardBody } from "@/components/ui";
import type { Department } from "@/types/api";

import { DoctorRegisterForm } from "./form";

export const metadata: Metadata = { title: "Doctor registration" };
// Department list comes from the API at request time (fetch result cached 5 min).
export const dynamic = "force-dynamic";

async function departments(): Promise<Department[]> {
  try {
    const res = await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/api/departments`, {
      next: { revalidate: 300 },
    });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

export default async function DoctorRegisterPage() {
  return (
    <Card>
      <CardBody className="space-y-5">
        <div>
          <h1>Doctor registration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account will be reviewed by a hospital administrator before you can sign in.
          </p>
        </div>
        <DoctorRegisterForm departments={await departments()} />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
        </p>
      </CardBody>
    </Card>
  );
}
