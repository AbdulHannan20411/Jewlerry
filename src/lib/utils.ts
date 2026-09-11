export { cn } from "cn";

import { CURRENCY } from "@/constants";

export function formatCurrency(
  amount: number,
  currencyCode: string = CURRENCY.code,
): string {
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat(CURRENCY.locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat(CURRENCY.locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
