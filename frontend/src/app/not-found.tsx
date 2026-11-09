import Link from "next/link";

import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow text-muted-foreground">Error 404</p>
      <h1 className="display-lg mt-4">
        Page <span className="text-primary">not found.</span>
      </h1>
      <p className="mt-4 max-w-sm text-muted-foreground">It may have moved, or you may not have access to it.</p>
      <Link href="/" className={buttonClass("action", "default", "mt-8")}>
        Go home
      </Link>
    </main>
  );
}
