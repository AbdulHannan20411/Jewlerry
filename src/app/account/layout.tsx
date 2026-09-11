import { requireUser } from "@/lib/permissions";
import { AccountNav } from "@/components/storefront/account-nav";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Every /account/** route requires a signed-in, non-blocked account.
  // proxy.ts already redirects signed-out visitors as a fast path; this is
  // the real (server-side, non-bypassable) check.
  const profile = await requireUser({ returnTo: "/account" });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <AccountNav fullName={profile.full_name || profile.username} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
