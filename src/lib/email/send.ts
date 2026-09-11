import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getServerEnv } from "@/lib/env";

let cachedTransporter: Transporter | null | undefined;

/**
 * Lazily built + cached at module scope (one connection pool per server
 * process, not per call). Returns null when SMTP isn't configured, so
 * callers fall back to the console/log dev transport instead of throwing.
 */
function getTransporter(): Transporter | null {
  if (cachedTransporter !== undefined) return cachedTransporter;

  const env = getServerEnv();
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    cachedTransporter = null;
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  return cachedTransporter;
}

/**
 * Sends one email, or logs it to the server console when SMTP isn't
 * configured (local dev default — never silently swallowed, never throws
 * and breaks the business action it's attached to). Failures are caught
 * and logged the same way: a notification email failing to send should
 * never fail the order/payment action that triggered it.
 */
export async function sendEmail(params: { to: string; subject: string; html: string; text?: string }): Promise<void> {
  const transporter = getTransporter();
  const env = getServerEnv();

  if (!transporter) {
    console.log(`[email:dev] To: ${params.to}\nSubject: ${params.subject}\n${params.text ?? params.html}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
  } catch (error) {
    console.error("[email] send failed:", params.subject, "->", params.to, error);
  }
}
