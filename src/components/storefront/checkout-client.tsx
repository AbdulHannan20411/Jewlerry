"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ImageOff } from "lucide-react";
import { checkoutDeliverySchema, type CheckoutDeliveryInput } from "@/lib/validations/orders";
import { getCartDetailsAction, createOrderAction } from "@/lib/orders/actions";
import { useCartStore } from "@/store/cart-store";
import { useMounted } from "@/hooks/use-mounted";
import { formatCurrency } from "@/lib/utils";
import { TextField, TextareaField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CartLineDetail } from "@/lib/orders/queries";

export function CheckoutClient({
  shippingCost,
  currencyCode,
  defaultValues,
}: {
  shippingCost: number;
  currencyCode: string;
  defaultValues: { customerName: string; customerPhone: string; customerEmail: string };
}) {
  const router = useRouter();
  const mounted = useMounted();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);

  const [details, setDetails] = React.useState<CartLineDetail[] | null>(null);
  const [loadingDetails, setLoadingDetails] = React.useState(true);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!mounted) return;
    (async () => {
      setLoadingDetails(true);
      const result = await getCartDetailsAction(items);
      setLoadingDetails(false);
      if (result.success) setDetails(result.data);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on mounted only: this is a one-time fetch when checkout loads, not a live sync with the cart store
  }, [mounted]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutDeliveryInput>({
    resolver: zodResolver(checkoutDeliverySchema),
    defaultValues: {
      customerName: defaultValues.customerName,
      customerPhone: defaultValues.customerPhone,
      customerEmail: defaultValues.customerEmail,
      shippingAddress: "",
      shippingCity: "",
      shippingNotes: "",
    },
  });

  const validLines = (details ?? []).filter((d) => d.exists && d.isActive && d.availableStock >= d.requestedQuantity);
  const hasIssues = (details ?? []).some(
    (d) => !d.exists || !d.isActive || d.availableStock < d.requestedQuantity,
  );
  const subtotal = validLines.reduce((sum, l) => sum + l.unitPrice * l.requestedQuantity, 0);
  const total = subtotal + shippingCost;

  function onSubmit(values: CheckoutDeliveryInput) {
    if (hasIssues || validLines.length === 0) {
      toast.error("Please fix the issues in your cart before checking out.");
      return;
    }

    startTransition(async () => {
      const result = await createOrderAction({
        ...values,
        items: validLines.map((l) => ({ productId: l.productId, quantity: l.requestedQuantity })),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      clearCart();
      toast.success("Order placed successfully.");
      router.push(`/account/orders/${result.data.orderId}`);
    });
  }

  if (!mounted || loadingDetails) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!details || details.length === 0) {
    return <p className="text-muted-foreground">Your cart is empty. Add something before checking out.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div>
          <h2 className="mb-3 font-heading text-lg font-semibold">Delivery details</h2>
          <FieldGroup>
            <TextField label="Full name" register={register("customerName")} error={errors.customerName} />
            <TextField label="Phone number" type="tel" register={register("customerPhone")} error={errors.customerPhone} />
            <TextField label="Email" type="email" register={register("customerEmail")} error={errors.customerEmail} />
            <TextField label="Delivery address" register={register("shippingAddress")} error={errors.shippingAddress} />
            <TextField label="City" register={register("shippingCity")} error={errors.shippingCity} />
            <TextareaField
              label="Delivery notes (optional)"
              register={register("shippingNotes")}
              error={errors.shippingNotes}
              rows={3}
            />
          </FieldGroup>
        </div>

        <div>
          <h2 className="mb-3 font-heading text-lg font-semibold">Order review</h2>
          <div className="space-y-3">
            {details.map((line) => {
              const lineOk = line.exists && line.isActive && line.availableStock >= line.requestedQuantity;
              return (
                <div key={line.productId} className="flex gap-3 rounded-lg border border-border/70 p-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {line.imageUrl ? (
                      <Image src={line.imageUrl} alt={line.name} fill sizes="64px" className="object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ImageOff className="size-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-center">
                    <p className="text-sm font-medium text-foreground">{line.name}</p>
                    <p className="text-xs text-muted-foreground">Qty {line.requestedQuantity}</p>
                    {!lineOk && (
                      <p className="text-xs text-destructive">
                        {!line.exists || !line.isActive
                          ? "No longer available"
                          : `Only ${line.availableStock} in stock`}{" "}
                        —{" "}
                        <a href="/cart" className="underline">
                          update your cart
                        </a>
                      </p>
                    )}
                  </div>
                  {lineOk && (
                    <p className="self-center text-sm font-medium text-foreground">
                      {formatCurrency(line.unitPrice * line.requestedQuantity, currencyCode)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="h-fit space-y-4 rounded-lg border border-border/70 p-4">
        <h2 className="font-heading text-lg font-semibold">Order Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal, currencyCode)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{formatCurrency(shippingCost, currencyCode)}</span>
          </div>
          <div className="flex justify-between border-t border-border/70 pt-2 font-medium">
            <span>Total</span>
            <span>{formatCurrency(total, currencyCode)}</span>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={pending || hasIssues || validLines.length === 0}>
          {pending ? "Placing order..." : "Place order"}
        </Button>
        <p className="text-xs text-muted-foreground">
          You&apos;ll choose a payment method and upload proof of payment on the next screen.
        </p>
      </div>
    </form>
  );
}
