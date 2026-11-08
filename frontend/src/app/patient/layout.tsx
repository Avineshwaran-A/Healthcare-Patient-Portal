import { AppShell } from "@/components/shell/app-shell";
import { requireRole } from "@/lib/server-api";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const me = await requireRole("patient");
  return <AppShell me={me}>{children}</AppShell>;
}
