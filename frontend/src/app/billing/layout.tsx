import { AppShell } from "@/components/shell/app-shell";
import { requireRole } from "@/lib/server-api";

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const me = await requireRole("billing");
  return <AppShell me={me}>{children}</AppShell>;
}
