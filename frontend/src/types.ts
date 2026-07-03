export type Role = "USER" | "ADMIN";

export type SessionUser = { id: string; email: string; role: Role };

export type OracleInfo = {
  source: string;
  updatedAt: string;
  ageMs: number;
  stale: boolean;
  staleAfterMs: number;
  priceUsd: string;
};

export type Market = {
  symbol: string;
  name: string;
  isCollateral: boolean;
  paused: boolean;
  priceUsd: string;
  oracle: OracleInfo;
  totalSupply: string;
  totalBorrow: string;
  available: string;
  protocolSupply: string;
  externalBorrow: string;
  utilization: string;
  supplyApr: string;
  borrowApr: string;
  ltv: string;
  liquidationThreshold: string;
  liquidationBonus: string;
  reserveFactor: string;
  ltvBps: number;
  liquidationThresholdBps: number;
  liquidationBonusBps: number;
  reserveFactorBps: number;
  closeFactorBps: number;
  baseAprBps: number;
  slope1AprBps: number;
  slope2AprBps: number;
  optimalUtilBps: number;
  badDebt: string;
  uncovered: string;
  tvlUsd: string;
  borrowUsd: string;
};

export type SupplyRow = {
  symbol: string;
  amount: string;
  amountUsd: string;
  apr: string;
  priceUsd: string;
  collateral: boolean;
  liquidationPriceUsd: string | null;
  dropToLiquidation: string | null;
};

export type BorrowRow = {
  symbol: string;
  amount: string;
  amountUsd: string;
  apr: string;
  priceUsd: string;
};

export type Portfolio = {
  healthFactor: string | null;
  collateralUsd: string;
  debtUsd: string;
  borrowPowerUsd: string;
  borrowPowerUsed: string | null;
  liquidatable: boolean;
  oracleStale: boolean;
  supplies: SupplyRow[];
  borrows: BorrowRow[];
};

export type StressRow = {
  id: string;
  label: string;
  group: "primary" | "historical";
  detail: string;
  rateMultiplierBps: number;
  healthFactor: string | null;
  liquidatable: boolean;
  collateralUsd: string;
  debtUsd: string;
  badDebtUsd: string;
  projectedInterest30d: string;
  dropToLiquidation: string | null;
  liquidationPriceUsd: string | null;
  liquidationSymbol: string | null;
};

export type BorrowPreview = {
  ok: boolean;
  code: string | null;
  error: string | null;
  clampedToLtv: boolean;
  collateralSymbol: string;
  collateralAmount: string;
  borrowSymbol: string;
  borrowAmount: string;
  healthFactorBefore: string | null;
  healthFactor: string | null;
  liquidationSymbol: string | null;
  liquidationPriceUsd: string | null;
  dropToLiquidation: string | null;
  collateralUsd: string;
  debtUsd: string;
  borrowApr: string;
  supplyApr: string;
  projectedInterest: { d1: string; d7: string; d30: string; d365: string };
  projectedDebt: { d1: string; d7: string; d30: string; d365: string };
  stress: StressRow[];
};

export type HistoryEvent = {
  id: string;
  kind: string;
  symbol: string | null;
  amount: string | null;
  createdAt: string;
  meta: { action?: string; healthFactor?: string | null } | null;
};

export type Notice = {
  id: string;
  kind: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type DeskUser = {
  id: string;
  email: string;
  role: Role;
  disabled: boolean;
  createdAt: string;
  supplies: number;
  borrows: number;
};
