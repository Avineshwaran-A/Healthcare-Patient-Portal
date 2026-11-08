import { AppShell } from "@/components/shell/app-shell";
import { requireRole } from "@/lib/server-api";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireRole("admin");
  return <AppShell me={me}>{children}</AppShell>;
}
