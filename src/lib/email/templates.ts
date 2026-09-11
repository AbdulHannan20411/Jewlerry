import { formatCurrency } from "@/lib/utils";

const BRAND = "Atelier Jewelry";
const GOLD = "#a8823c";
const INK = "#2b2420";

/** Shared HTML shell (inline styles only — most email clients strip <style> tags). */
function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ec;font-family:Georgia,'Times New Roman',serif;color:${INK};">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:${INK};padding:20px 28px;">
                <span style="color:${GOLD};font-size:20px;letter-spacing:0.05em;">${BRAND}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="font-size:18px;margin:0 0 16px;color:${INK};">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#f2ece0;font-size:12px;color:#77695c;">
                This is an automated message from ${BRAND}. Please do not reply directly to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${href}" style="background:${GOLD};color:#fff;text-decoration:none;padding:10px 20px;border-radius:4px;font-size:14px;display:inline-block;">${label}</a></p>`;
}

function siteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base}${path}`;
}

export function orderConfirmationEmail(params: {
  orderNumber: string;
  customerName: string;
  total: number;
  currencyCode: string;
  orderId: number;
}) {
  const subject = `Order confirmation — ${params.orderNumber}`;
  const html = layout(
    "Thank you for your order",
    `<p>Hi ${params.customerName},</p>
     <p>We've received your order <strong>${params.orderNumber}</strong> for
     <strong>${formatCurrency(params.total, params.currencyCode)}</strong>. We'll email you again once your
     payment is confirmed and your order is on its way.</p>
     ${button(siteUrl(`/account/orders/${params.orderId}`), "View your order")}`,
  );
  return { subject, html };
}

export function orderStatusChangedEmail(params: {
  orderNumber: string;
  customerName: string;
  statusLabel: string;
  orderId: number;
}) {
  const subject = `Order update — ${params.orderNumber} is now ${params.statusLabel}`;
  const html = layout(
    "Your order status has changed",
    `<p>Hi ${params.customerName},</p>
     <p>Your order <strong>${params.orderNumber}</strong> is now
     <strong>${params.statusLabel}</strong>.</p>
     ${button(siteUrl(`/account/orders/${params.orderId}`), "View your order")}`,
  );
  return { subject, html };
}

export function paymentSubmittedEmail(params: { orderNumber: string; customerName: string; orderId: number }) {
  const subject = `Payment received for review — ${params.orderNumber}`;
  const html = layout(
    "Payment submitted",
    `<p>Hi ${params.customerName},</p>
     <p>Thanks — we've received your payment proof for order <strong>${params.orderNumber}</strong>
     and it's now awaiting review. We'll email you as soon as it's confirmed.</p>
     ${button(siteUrl(`/account/orders/${params.orderId}`), "View your order")}`,
  );
  return { subject, html };
}

export function paymentApprovedEmail(params: {
  orderNumber: string;
  customerName: string;
  amount: number;
  currencyCode: string;
  orderId: number;
}) {
  const subject = `Payment confirmed — ${params.orderNumber}`;
  const html = layout(
    "Payment confirmed",
    `<p>Hi ${params.customerName},</p>
     <p>Your payment of <strong>${formatCurrency(params.amount, params.currencyCode)}</strong> for order
     <strong>${params.orderNumber}</strong> has been confirmed. We're now preparing your order.</p>
     ${button(siteUrl(`/account/orders/${params.orderId}`), "View your order")}`,
  );
  return { subject, html };
}

export function paymentRejectedEmail(params: {
  orderNumber: string;
  customerName: string;
  reason: string;
  note?: string | null;
  orderId: number;
}) {
  const subject = `Payment could not be confirmed — ${params.orderNumber}`;
  const html = layout(
    "We couldn't confirm your payment",
    `<p>Hi ${params.customerName},</p>
     <p>We weren't able to confirm your payment for order <strong>${params.orderNumber}</strong>.</p>
     <p><strong>Reason:</strong> ${params.reason}${params.note ? `<br/>${params.note}` : ""}</p>
     <p>Please submit a new payment for this order, or contact us if you believe this is a mistake.</p>
     ${button(siteUrl(`/account/orders/${params.orderId}/pay`), "Submit payment again")}`,
  );
  return { subject, html };
}

export function newOrderAdminAlertEmail(params: {
  orderNumber: string;
  customerName: string;
  total: number;
  currencyCode: string;
  orderId: number;
}) {
  const subject = `New order — ${params.orderNumber}`;
  const html = layout(
    "New order placed",
    `<p>${params.customerName} just placed order <strong>${params.orderNumber}</strong> for
     <strong>${formatCurrency(params.total, params.currencyCode)}</strong>.</p>
     ${button(siteUrl(`/admin/orders/${params.orderId}`), "View in admin")}`,
  );
  return { subject, html };
}

export function newPaymentAdminAlertEmail(params: {
  orderNumber: string;
  customerName: string;
  amount: number;
  currencyCode: string;
  paymentId: number;
}) {
  const subject = `Payment submitted for review — ${params.orderNumber}`;
  const html = layout(
    "Payment awaiting review",
    `<p>${params.customerName} submitted a payment of
     <strong>${formatCurrency(params.amount, params.currencyCode)}</strong> for order
     <strong>${params.orderNumber}</strong>.</p>
     ${button(siteUrl(`/admin/payments/${params.paymentId}`), "Review payment")}`,
  );
  return { subject, html };
}

export function genericNotificationEmail(params: { title: string; message: string; ctaUrl?: string; ctaLabel?: string }) {
  const html = layout(
    params.title,
    `<p>${params.message}</p>${params.ctaUrl && params.ctaLabel ? button(siteUrl(params.ctaUrl), params.ctaLabel) : ""}`,
  );
  return { subject: params.title, html };
}
