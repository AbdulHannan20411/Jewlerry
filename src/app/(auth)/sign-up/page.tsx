import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpForm } from "@/components/storefront/sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Create an account</CardTitle>
        <CardDescription>Join to track orders, save reviews, and check out faster.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SignUpForm />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
