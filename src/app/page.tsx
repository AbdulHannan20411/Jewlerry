import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/permissions";

/**
 * Temporary landing page. The real storefront home (hero/banners, featured
 * & new & sale products, categories, store info, CTAs) is built in Phase 5
 * — this just gets navigation and auth working end-to-end in the meantime.
 */
export default async function Home() {
  const profile = await getCurrentProfile();

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-4 text-center">
      <p className="mb-3 text-sm font-medium tracking-[0.2em] text-primary uppercase">
        Fine Jewelry
      </p>
      <h1 className="font-heading max-w-xl text-4xl font-semibold text-foreground sm:text-5xl">
        Atelier Jewelry
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        The storefront is under construction. Sign in or create an account to
        get started.
      </p>
      <div className="mt-8 flex gap-3">
        {profile ? (
          <Button asChild>
            <Link href={profile.role === "admin" ? "/admin" : "/account"}>
              Go to {profile.role === "admin" ? "admin dashboard" : "my account"}
            </Link>
          </Button>
        ) : (
          <>
            <Button asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sign-up">Create account</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
