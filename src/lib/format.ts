export function money(n: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(n);
}

export function shortDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const TYPE_LABELS: Record<string, string> = {
  equal: "Equal split",
  percentage: "Percentage",
  shares: "Shares / ratio",
  exact: "Exact amounts",
};

export function splitTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}
