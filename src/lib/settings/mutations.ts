import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { SiteSettingsFormInput, AdminSettingsFormInput } from "@/lib/validations/admin";

export async function updateSiteSettings(supabase: SupabaseClient<Database>, input: SiteSettingsFormInput) {
  const { error } = await supabase
    .from("site_settings")
    .update({
      store_name: input.storeName,
      store_email: input.storeEmail || null,
      store_phone: input.storePhone || null,
      whatsapp_number: input.whatsappNumber || null,
      address: input.address || null,
      business_hours: input.businessHours || null,
      low_stock_threshold: input.lowStockThreshold,
      shipping_cost: input.shippingCost,
      currency_code: input.currencyCode.toUpperCase(),
      dark_mode_enabled: input.darkModeEnabled,
    })
    .eq("id", 1);

  if (error) return { ok: false as const, error: "Could not save store settings." };
  return { ok: true as const };
}

export async function updateAdminSettings(supabase: SupabaseClient<Database>, input: AdminSettingsFormInput) {
  const { error } = await supabase
    .from("admin_settings")
    .update({
      invoice_prefix: input.invoicePrefix,
      order_auto_cancel_unconfirmed_hours: input.orderAutoCancelUnconfirmedHours,
      notify_admin_on_new_order: input.notifyAdminOnNewOrder,
      notify_admin_on_payment_submitted: input.notifyAdminOnPaymentSubmitted,
    })
    .eq("id", 1);

  if (error) return { ok: false as const, error: "Could not save automation settings." };
  return { ok: true as const };
}
