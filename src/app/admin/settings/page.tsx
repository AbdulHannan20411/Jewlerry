import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/permissions";
import { getSiteSettings, getAdminSettings } from "@/lib/settings/queries";
import { UpdateProfileForm } from "@/components/storefront/update-profile-form";
import { ChangePasswordForm } from "@/components/storefront/change-password-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";

export const metadata: Metadata = { title: "Admin Settings" };

export default async function AdminSettingsPage() {
  const profile = await requireAdmin();
  const [siteSettings, adminSettings] = await Promise.all([getSiteSettings(), getAdminSettings()]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage the store and your admin account.</p>
      </div>

      <Tabs defaultValue="store">
        <TabsList>
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Store information</CardTitle>
              <CardDescription>Shown to customers in the footer, contact page, and checkout.</CardDescription>
            </CardHeader>
            <CardContent>
              {siteSettings && (
                <SiteSettingsForm
                  defaultValues={{
                    storeName: siteSettings.store_name,
                    storeEmail: siteSettings.store_email ?? "",
                    storePhone: siteSettings.store_phone ?? "",
                    whatsappNumber: siteSettings.whatsapp_number ?? "",
                    address: siteSettings.address ?? "",
                    businessHours: siteSettings.business_hours ?? "",
                    lowStockThreshold: siteSettings.low_stock_threshold,
                    shippingCost: siteSettings.shipping_cost,
                    currencyCode: siteSettings.currency_code,
                    darkModeEnabled: siteSettings.dark_mode_enabled,
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle>Automation & alerts</CardTitle>
              <CardDescription>Internal settings — not shown to customers.</CardDescription>
            </CardHeader>
            <CardContent>
              {adminSettings && (
                <AdminSettingsForm
                  defaultValues={{
                    invoicePrefix: adminSettings.invoice_prefix,
                    orderAutoCancelUnconfirmedHours: adminSettings.order_auto_cancel_unconfirmed_hours,
                    notifyAdminOnNewOrder: adminSettings.notify_admin_on_new_order,
                    notifyAdminOnPaymentSubmitted: adminSettings.notify_admin_on_payment_submitted,
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>{profile.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <UpdateProfileForm
                defaultValues={{
                  fullName: profile.full_name,
                  username: profile.username,
                  phone: profile.phone ?? "",
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your admin password.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Choose your theme.</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeToggle persistForUser />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
