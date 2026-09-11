import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <p className="font-heading text-6xl font-semibold text-primary">401</p>
      <h1 className="font-heading text-2xl font-semibold">Please sign in to continue</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        You need to be signed in to view this page.
      </p>
      <Button asChild>
        <Link href="/sign-in">Sign in</Link>
      </Button>
    </div>
  );
}
