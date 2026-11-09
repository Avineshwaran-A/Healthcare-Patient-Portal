import { AppShell } from "@/components/shell/app-shell";
import { requireRole } from "@/lib/server-api";

export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const me = await requireRole("lab");
  return <AppShell me={me}>{children}</AppShell>;
}
