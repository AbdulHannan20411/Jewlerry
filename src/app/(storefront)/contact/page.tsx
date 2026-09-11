import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { getSiteSettings } from "@/lib/settings/queries";
import { ContactForm } from "@/components/storefront/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with our team.",
};

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const socialLinks = (settings?.social_links ?? []) as { label: string; url: string }[];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="font-heading text-3xl font-semibold">Contact Us</h1>
      <p className="mt-2 max-w-lg text-muted-foreground">
        Have a question about an order, a product, or anything else? Send us a message and
        we&apos;ll respond as soon as we can.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          {settings?.store_email && (
            <InfoRow icon={Mail} label="Email" value={settings.store_email} />
          )}
          {settings?.store_phone && (
            <InfoRow icon={Phone} label="Phone" value={settings.store_phone} />
          )}
          {settings?.address && <InfoRow icon={MapPin} label="Address" value={settings.address} />}
          {settings?.business_hours && (
            <InfoRow icon={Clock} label="Business hours" value={settings.business_hours} />
          )}
          {socialLinks.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground">Follow us</p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {socialLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <ContactForm />
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
