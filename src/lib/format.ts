export function fmtEuro(n: number, digits = 0): string {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtPct(n: number): string {
  return `${(n * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

export function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonthsKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return currentMonthKey(dt);
}

export function monthKeysFrom(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonthsKey(start, i));
}

export function labelMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  });
  return label.replace(".", "");
}

export function uid(): string {
  return crypto.randomUUID();
}
