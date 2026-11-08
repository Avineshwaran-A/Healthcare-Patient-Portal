"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { api } from "@/lib/api";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await api("/auth/logout", { method: "POST" }).catch(() => {});
        window.location.href = "/login";
      }}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-60"
    >
      <LogOut className="h-[18px] w-[18px]" aria-hidden />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
