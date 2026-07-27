export function pct(ratio: string | null | undefined, digits = 2): string {
  if (ratio === null || ratio === undefined || ratio === "") return "—";
  const n = Number(ratio) * 100;
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function usd(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export function amt(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  const digits = Math.abs(n) >= 100 ? 2 : 4;
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function hfText(value: string | null): string {
  if (value === null) return "Clear";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : value;
}

export function hfTone(value: string | null, liquidatable = false): string {
  if (liquidatable) return "text-ember";
  if (value === null) return "text-acid";
  const n = Number(value);
  if (n < 1) return "text-ember";
  if (n < 1.2) return "text-ember";
  if (n < 1.5) return "text-gold";
  return "text-acid";
}

export function age(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const KIND: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAW: "Withdrawal",
  BORROW: "Borrow",
  REPAY: "Repayment",
  LIQUIDATION: "Liquidation",
  PARAM_CHANGE: "Parameter change",
};

export function kindLabel(kind: string, action?: string): string {
  if (kind === "LIQUIDATION") {
    if (action === "seize") return "Liquidation seize";
    if (action === "bad_debt") return "Bad debt";
    if (action === "repay") return "Liquidation repay";
  }
  return KIND[kind] ?? kind;
}
