import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/permissions";
import { UpdateProfileForm } from "@/components/storefront/update-profile-form";
import { ChangePasswordForm } from "@/components/storefront/change-password-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const metadata: Metadata = { title: "Admin Settings" };

/**
 * The admin's own account settings (Profile/Security/Appearance). Store-
 * wide configuration (Payment Methods, Store Information, Order/Shipping/
 * Notification Settings) is added here as separate tabs in Phase 11, once
 * those systems exist.
 */
export default async function AdminSettingsPage() {
  const profile = await requireAdmin();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your admin account.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

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
