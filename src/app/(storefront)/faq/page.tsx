import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Frequently asked questions.",
};

export default async function FaqPage() {
  const supabase = await createServerSupabaseClient();
  const { data: faqs } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_active", true)
    .order("display_order");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-semibold">Frequently Asked Questions</h1>
      <p className="mt-2 text-muted-foreground">
        Can&apos;t find what you&apos;re looking for?{" "}
        <a href="/contact" className="text-primary hover:underline">
          Contact us
        </a>
        .
      </p>

      {faqs && faqs.length > 0 ? (
        <Accordion type="single" collapsible className="mt-8">
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={String(faq.id)}>
              <AccordionTrigger className="text-left font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">No FAQs yet.</p>
      )}
    </div>
  );
}
