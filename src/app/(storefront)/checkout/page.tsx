import type { Metadata } from "next";
import { requireUser } from "@/lib/permissions";
import { getSiteSettings } from "@/lib/settings/queries";
import { CheckoutClient } from "@/components/storefront/checkout-client";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const profile = await requireUser({ returnTo: "/checkout" });
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-8 font-heading text-3xl font-semibold">Checkout</h1>
      <CheckoutClient
        shippingCost={settings?.shipping_cost ?? 0}
        currencyCode={settings?.currency_code ?? "PKR"}
        defaultValues={{
          customerName: profile.full_name,
          customerPhone: profile.phone ?? "",
          customerEmail: profile.email,
        }}
      />
    </div>
  );
}
