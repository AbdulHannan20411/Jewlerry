"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, ShieldCheck } from "lucide-react";

// Extended in later phases as each area ships (orders in Phase 6,
// notifications in Phase 8, reviews in Phase 10) — kept short here rather
// than linking to pages that don't exist yet.
const links = [
  { href: "/account", label: "Profile", icon: User },
  { href: "/account/security", label: "Security", icon: ShieldCheck },
] as const;

export function AccountNav({ fullName }: { fullName: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="space-y-1">
      <p className="mb-3 truncate px-2 text-sm font-medium text-muted-foreground">
        {fullName}
      </p>
      {links.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4" aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
