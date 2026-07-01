export function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not set";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatMoney(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function fullName(first?: string | null, last?: string | null, fallback?: string | null) {
  return [first, last].filter(Boolean).join(" ") || fallback || "Unnamed";
}

export function isDateWithinAllowedWindow(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffTime = now.getTime() - target.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
  return diffDays >= 0 && diffDays <= 2;
}
