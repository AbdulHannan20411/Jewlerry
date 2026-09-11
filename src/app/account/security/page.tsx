import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/permissions";
import { ChangePasswordForm } from "@/components/storefront/change-password-form";

export const metadata: Metadata = { title: "Security" };

export default async function AccountSecurityPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Security</h1>
        <p className="text-sm text-muted-foreground">Change your password.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Choose a strong password you don&apos;t use anywhere else.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
