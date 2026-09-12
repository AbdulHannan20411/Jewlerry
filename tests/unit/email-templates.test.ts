import { describe, expect, it } from "vitest";
import { orderConfirmationEmail, genericNotificationEmail } from "@/lib/email/templates";

describe("email templates escape user-controlled text", () => {
  it("escapes a malicious customer name in orderConfirmationEmail", () => {
    const { html } = orderConfirmationEmail({
      orderNumber: "ORD-2026-000001",
      customerName: "<script>alert(1)</script>",
      total: 1000,
      currencyCode: "PKR",
      orderId: 1,
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("escapes the admin-composed title/message in genericNotificationEmail", () => {
    const { html } = genericNotificationEmail({
      title: '<img src=x onerror="alert(1)">',
      message: "Sale ends & terms apply <b>now</b>",
    });

    expect(html).not.toContain('<img src=x onerror="alert(1)">');
    expect(html).toContain("Sale ends &amp; terms apply &lt;b&gt;now&lt;/b&gt;");
  });
});
