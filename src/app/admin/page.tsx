import type { Metadata } from "next";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin Dashboard" };

/**
 * Minimal real dashboard for now (genuine counts, not placeholder data) —
 * expanded into the full stats/charts/date-range dashboard from the spec
 * in Phase 11, once Orders/Payments/Reports exist to summarize.
 */
export default async function AdminDashboardPage() {
  const profile = await requireAdmin();
  const supabase = await createServerSupabaseClient();

  const [{ count: productCount }, { count: orderCount }, { count: customerCount }] =
    await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
    ]);

  const stats = [
    { label: "Products", value: productCount ?? 0 },
    { label: "Orders", value: orderCount ?? 0 },
    { label: "Customers", value: customerCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          Welcome back, {profile.full_name || profile.username}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s a quick look at the store.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="gap-1.5">
              <CardDescription>{stat.label}</CardDescription>
              {/* Stat-tile value: sans (never the heading serif), proportional figures. */}
              <p className="font-sans text-3xl font-semibold text-foreground">
                {stat.value.toLocaleString()}
              </p>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
