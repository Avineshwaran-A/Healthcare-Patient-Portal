import Link from "next/link";

import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-1">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">It may have moved, or you may not have access to it.</p>
      <Link href="/" className={buttonClass("outline", "default", "mt-6")}>Go home</Link>
    </main>
  );
}
