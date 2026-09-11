import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ImageOff } from "lucide-react";
import { requireUser } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrderById } from "@/lib/orders/queries";
import { canCustomerTransition } from "@/lib/orders/transitions";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { OrderTimeline } from "@/components/storefront/order-timeline";
import { CancelOrderButton, RequestReturnButton } from "@/components/storefront/order-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Order Details" };

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const supabase = await createServerSupabaseClient();
  const order = await getOrderById(supabase, orderId);
  if (!order) notFound();

  const canCancel = canCustomerTransition(order.status, "cancelled");
  const canReturn = canCustomerTransition(order.status, "returned");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link href="/account/orders" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to orders
      </Link>

      <div className="mt-3 mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">Placed {formatDate(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} fill sizes="64px" className="object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ImageOff className="size-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.unitPrice, order.currencyCode)} &times; {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(item.lineTotal, order.currencyCode)}
                    </p>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal, order.currencyCode)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>{formatCurrency(order.shippingCost, order.currencyCode)}</span>
                </div>
                <div className="flex justify-between font-medium text-foreground">
                  <span>Total</span>
                  <span>{formatCurrency(order.total, order.currencyCode)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p className="text-foreground">{order.customerName}</p>
              <p>{order.customerPhone}</p>
              <p>{order.customerEmail}</p>
              <p>
                {order.shippingAddress}
                {order.shippingCity ? `, ${order.shippingCity}` : ""}
              </p>
              {order.shippingNotes && <p>Note: {order.shippingNotes}</p>}
            </CardContent>
          </Card>

          {(order.returnReason || order.cancelledReason) && (
            <Card>
              <CardHeader>
                <CardTitle>{order.status === "cancelled" ? "Cancellation" : "Return"} details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>{order.returnReason || order.cancelledReason}</p>
                {order.returnNotes && <p>{order.returnNotes}</p>}
              </CardContent>
            </Card>
          )}

          {(canCancel || canReturn) && (
            <div className="flex gap-3">
              {canCancel && <CancelOrderButton orderId={order.id} />}
              {canReturn && <RequestReturnButton orderId={order.id} />}
            </div>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Order status</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderTimeline events={order.statusHistory} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
