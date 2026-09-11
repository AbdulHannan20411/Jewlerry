import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCustomerById } from "@/lib/customers/queries";
import { searchOrders } from "@/lib/orders/queries";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { BlockCustomerButton, UnblockCustomerButton, DeleteCustomerButton } from "@/components/admin/customer-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Customer Details" };

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const customer = await getCustomerById(supabase, id);
  if (!customer) notFound();

  const orders = await searchOrders(supabase, { customerId: id, pageSize: 10 });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/customers" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to customers
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold">{customer.fullName}</h1>
            <p className="text-sm text-muted-foreground">
              @{customer.username} &middot; Joined {formatDate(customer.createdAt)}
            </p>
          </div>
          <Badge variant={customer.blockedAt ? "destructive" : "success"}>
            {customer.blockedAt ? "Blocked" : "Active"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p className="text-foreground">{customer.email}</p>
          <p>{customer.phone ?? "No phone on file"}</p>
        </CardContent>
      </Card>

      {customer.blockedAt && (
        <Card>
          <CardHeader>
            <CardTitle>Block details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Blocked {formatDate(customer.blockedAt)}</p>
            <p>{customer.blockedReason}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {customer.orderCount} paid order{customer.orderCount === 1 ? "" : "s"} &middot; total spent{" "}
            {formatCurrency(customer.totalSpent)}
          </p>
          {orders.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {orders.items.map((order) => (
                <div key={order.id} className="flex items-center justify-between text-sm">
                  <Link href={`/admin/orders/${order.id}`} className="font-medium text-foreground hover:underline">
                    {order.orderNumber}
                  </Link>
                  <span className="text-muted-foreground">{formatDate(order.createdAt)}</span>
                  <span>{formatCurrency(order.total, order.currencyCode)}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {customer.blockedAt ? (
          <UnblockCustomerButton customerId={customer.id} />
        ) : (
          <BlockCustomerButton customerId={customer.id} />
        )}
        {!customer.deletedAt && <DeleteCustomerButton customerId={customer.id} />}
      </div>
    </div>
  );
}
