import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardBody } from "@/components/ui";
import { getMe } from "@/lib/server-api";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const me = await getMe();
  if (me) redirect(`/${me.role}`);
  return (
    <Card>
      <CardBody className="space-y-5">
        <div>
          <h1>Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Patients and all hospital staff use the same sign-in.</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          New patient?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
