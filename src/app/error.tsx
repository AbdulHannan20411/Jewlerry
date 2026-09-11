"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side details (stack traces, DB errors) are intentionally
    // never sent to the client — only a generic message + a digest the
    // user can quote to support.
    console.error("[app error]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="font-heading text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        We hit an unexpected error. Please try again — if it keeps
        happening, let us know{error.digest ? ` (reference: ${error.digest})` : ""}.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
