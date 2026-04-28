import { format } from "date-fns";

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string, compact = false) {
  const key = `${currency}-${compact ? "compact" : "full"}`;
  const existing = currencyFormatters.get(key);
  if (existing) {
    return existing;
  }

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  });

  currencyFormatters.set(key, formatter);
  return formatter;
}

export function formatProjectCurrency(amount: number, currency: string) {
  return getCurrencyFormatter(currency).format(amount);
}

export function formatProjectCompactCurrency(amount: number, currency: string) {
  return getCurrencyFormatter(currency, true).format(amount);
}

export function formatProjectDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  try {
    return format(new Date(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

export function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function percentOf(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}
