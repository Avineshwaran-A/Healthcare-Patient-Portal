import { CalendarCheck, FileText, ShieldCheck, Stethoscope } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui";
import { getMe } from "@/lib/server-api";

const FEATURES = [
  { icon: CalendarCheck, title: "Book in minutes", text: "See real doctor availability and reserve a slot instantly." },
  { icon: FileText, title: "Your records, one place", text: "Prescriptions, consultation notes and lab reports." },
  { icon: Stethoscope, title: "Built for clinicians", text: "Daily schedules, patient history and digital prescriptions." },
  { icon: ShieldCheck, title: "Privacy first", text: "Role-based access, treatment-relationship checks and audit logs." },
];

export default async function Home() {
  const me = await getMe();
  if (me) redirect(`/${me.role}`);

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between">
          <Logo />
          <div className="flex gap-2">
            <Link href="/login" className={buttonClass("ghost", "sm")}>
              Sign in
            </Link>
            <Link href="/register" className={buttonClass("default", "sm")}>
              Register
            </Link>
          </div>
        </div>
      </header>
      <main className="container py-12 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">Healthcare Patient Portal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Appointments, prescriptions and reports — simply connected.
          </h1>
          <p className="mt-4 text-muted-foreground">
            One secure portal for patients, doctors and hospital administrators.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className={buttonClass()}>
              Create patient account
            </Link>
            <Link href="/login" className={buttonClass("outline")}>
              Sign in
            </Link>
          </div>
        </div>
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-lg border bg-card p-5">
              <Icon className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="mt-3">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-xs text-muted-foreground">
          Demo environment with synthetic data only. This portal does not provide diagnosis or treatment advice.
          Doctors can <Link href="/register/doctor" className="underline">apply for an account</Link>.
        </p>
      </main>
    </div>
  );
}
