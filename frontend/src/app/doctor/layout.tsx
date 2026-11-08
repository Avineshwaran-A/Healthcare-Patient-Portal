import { AppShell } from "@/components/shell/app-shell";
import { requireRole } from "@/lib/server-api";

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const me = await requireRole("doctor");
  return <AppShell me={me}>{children}</AppShell>;
}
