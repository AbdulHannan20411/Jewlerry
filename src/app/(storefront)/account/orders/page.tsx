import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchOrders } from "@/lib/orders/queries";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PackageX } from "lucide-react";

export const metadata: Metadata = { title: "My Orders" };

export default async function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();
  const { page } = await searchParams;
  const supabase = await createServerSupabaseClient();
  // RLS scopes this to the signed-in customer's own orders automatically.
  const result = await searchOrders(supabase, { page: page ? Number(page) : 1 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">My Orders</h1>
        <p className="text-sm text-muted-foreground">
          {result.totalCount} order{result.totalCount === 1 ? "" : "s"}
        </p>
      </div>

      {result.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <PackageX className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-muted-foreground">You haven&apos;t placed any orders yet.</p>
          <Button asChild>
            <Link href="/products">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {result.items.map((order) => (
            <Link key={order.id} href={`/account/orders/${order.id}`}>
              <Card className="flex-row items-center justify-between gap-4 p-4 transition-colors hover:border-primary">
                <div>
                  <p className="font-medium text-foreground">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.createdAt)} &middot; {order.itemCount} item
                    {order.itemCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-sans text-sm font-semibold text-foreground">
                    {formatCurrency(order.total, order.currencyCode)}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
    </div>
  );
}
