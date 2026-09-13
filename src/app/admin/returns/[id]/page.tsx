import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getReturnRequestById } from "@/lib/returns/queries";
import { getOrderById } from "@/lib/orders/queries";
import { ReturnReviewPanel } from "@/components/admin/return-review-panel";
import { ReturnRequestStatusBadge } from "@/components/shared/return-request-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Review Return Request" };

export default async function AdminReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId)) notFound();

  const supabase = await createServerSupabaseClient();
  const request = await getReturnRequestById(supabase, requestId);
  if (!request) notFound();
  const order = await getOrderById(supabase, request.orderId);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/returns" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to returns
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold">{request.title}</h1>
            <p className="text-sm text-muted-foreground">
              {request.orderNumber} &middot; Requested {formatDate(request.createdAt)}
            </p>
          </div>
          <ReturnRequestStatusBadge status={request.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Proof photos</CardTitle>
          </CardHeader>
          <CardContent>
            <ReturnReviewPanel request={request} orderStatus={order?.status ?? "delivered"} />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order</span>
              <Link href={`/admin/orders/${request.orderId}`} className="font-medium text-foreground hover:underline">
                {request.orderNumber}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span className="text-foreground">{request.customerName}</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Reason</span>
              <p className="whitespace-pre-line text-foreground">{request.reason}</p>
            </div>
            {request.decidedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reviewed</span>
                <span className="text-foreground">{formatDate(request.decidedAt)}</span>
              </div>
            )}
            {request.receivedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received</span>
                <span className="text-foreground">{formatDate(request.receivedAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
