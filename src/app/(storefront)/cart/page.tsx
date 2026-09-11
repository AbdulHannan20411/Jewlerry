import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings/queries";
import { CartClient } from "@/components/storefront/cart-client";

export const metadata: Metadata = { title: "Your Cart" };

export default async function CartPage() {
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="font-heading text-3xl font-semibold">Your Cart</h1>
      <div className="mt-8">
        <CartClient
          shippingCost={settings?.shipping_cost ?? 0}
          currencyCode={settings?.currency_code ?? "PKR"}
        />
      </div>
    </div>
  );
}
