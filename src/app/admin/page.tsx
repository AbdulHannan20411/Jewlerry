import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRevenueOverTime, getOrdersByStatus, getTopProducts, getQuickStats } from "@/lib/reports/queries";
import { RevenueChart, OrdersByStatusChart, TopProductsChart } from "@/components/admin/dashboard-charts";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const profile = await requireAdmin();
  const supabase = await createServerSupabaseClient();

  const [{ count: productCount }, { count: orderCount }, { count: customerCount }, revenue, ordersByStatus, topProducts, quickStats] =
    await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
      getRevenueOverTime(supabase, 30),
      getOrdersByStatus(supabase),
      getTopProducts(supabase, 5),
      getQuickStats(supabase),
    ]);

  const totalRevenue = revenue.reduce((sum, r) => sum + r.revenue, 0);

  const stats = [
    { label: "Revenue (30 days)", value: formatCurrency(totalRevenue) },
    { label: "Products", value: (productCount ?? 0).toLocaleString() },
    { label: "Orders", value: (orderCount ?? 0).toLocaleString() },
    { label: "Customers", value: (customerCount ?? 0).toLocaleString() },
  ];

  const alerts = [
    { label: "Payments awaiting review", value: quickStats.pendingPayments, href: "/admin/payments" },
    { label: "Unconfirmed orders", value: quickStats.unconfirmedOrders, href: "/admin/orders" },
    { label: "Low stock products", value: quickStats.lowStockProducts, href: "/admin/products" },
    { label: "Unread messages", value: quickStats.unreadContactMessages, href: "/admin/contact" },
  ].filter((a) => a.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          Welcome back, {profile.full_name || profile.username}
        </h1>
        <p className="text-sm text-muted-foreground">Here&apos;s a quick look at the store.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="gap-1.5">
              <CardDescription>{stat.label}</CardDescription>
              <p className="font-sans text-3xl font-semibold text-foreground">{stat.value}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((alert) => (
            <Link key={alert.label} href={alert.href as Route}>
              <Badge variant="warning" className="cursor-pointer px-3 py-1.5 text-sm">
                {alert.value} {alert.label}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Revenue — last 30 days</CardTitle>
            <CardDescription>Confirmed orders only (payment received).</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders by status</CardTitle>
            <CardDescription>All-time.</CardDescription>
          </CardHeader>
          <CardContent>
            <OrdersByStatusChart data={ordersByStatus} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top products</CardTitle>
          <CardDescription>By units sold, confirmed orders only.</CardDescription>
        </CardHeader>
        <CardContent>
          <TopProductsChart data={topProducts} />
        </CardContent>
      </Card>
    </div>
  );
}
