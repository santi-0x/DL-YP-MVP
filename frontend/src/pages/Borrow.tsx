import { motion } from "framer-motion";
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Page, Title } from "../components/Ui";
import { amt, hfText, hfTone, pct, usd } from "../format";
import type { BorrowPreview } from "../types";

const ASSETS = ["ETH", "BTC", "WBTC", "LINK", "USDC"];
const PRESETS = [
  { id: "2.2", label: "Conservative", hint: "HF 2.20" },
  { id: "1.7", label: "Moderate", hint: "HF 1.70" },
  { id: "1.35", label: "Elevated", hint: "HF 1.35 · watch alert" },
];

export function BorrowPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [collateralSymbol, setCollateralSymbol] = useState(params.get("collateral") || "ETH");
  const [borrowSymbol, setBorrowSymbol] = useState(params.get("borrow") || "USDC");
  const [collateralAmount, setCollateralAmount] = useState("1");
  const [mode, setMode] = useState<"target" | "amount">("target");
  const [target, setTarget] = useState("1.35");
  const [borrowAmount, setBorrowAmount] = useState("1000");
  const [preview, setPreview] = useState<BorrowPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const body = useMemo(() => {
    const common = { collateralSymbol, collateralAmount: collateralAmount || "0", borrowSymbol };
    return mode === "amount" ? { ...common, borrowAmount } : { ...common, targetHealthFactor: target };
  }, [collateralSymbol, collateralAmount, borrowSymbol, mode, target, borrowAmount]);

  async function model(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setPreview(await api<BorrowPreview>("/api/simulate/borrow", { method: "POST", body: JSON.stringify(body) }));
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Could not model the loan");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview?.ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ notification: { title: string } | null }>("/api/positions/borrow", {
        method: "POST",
        body: JSON.stringify({
          collateralSymbol: preview.collateralSymbol,
          collateralAmount: preview.collateralAmount,
          borrowSymbol: preview.borrowSymbol,
          borrowAmount: preview.borrowAmount,
        }),
      });
      const alert = res.notification ? ` ${res.notification.title}.` : "";
      navigate("/position", {
        state: { flash: `Committed ${amt(preview.borrowAmount)} ${preview.borrowSymbol}. Health factor ${hfText(preview.healthFactor)}.${alert}` },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <Title
        kicker="Borrow"
        title="Model the loan first"
        lede="Terms, interest, and liquidation price are computed by the same fixed-point engine that books the position. Committing does not move tokens."
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <form onSubmit={model} className="space-y-4 rounded-3xl border border-line bg-panel p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-mute">Collateral
              <select className="mt-1" value={collateralSymbol} onChange={(e) => { setCollateralSymbol(e.target.value); setPreview(null); }}>
                {ASSETS.map((asset) => <option key={asset}>{asset}</option>)}
              </select>
            </label>
            <label className="text-sm text-mute">Additional amount
              <input className="mt-1" value={collateralAmount} onChange={(e) => { setCollateralAmount(e.target.value); setPreview(null); }} />
            </label>
            <label className="text-sm text-mute">Borrow
              <select className="mt-1" value={borrowSymbol} onChange={(e) => { setBorrowSymbol(e.target.value); setPreview(null); }}>
                {ASSETS.map((asset) => <option key={asset}>{asset}</option>)}
              </select>
            </label>
            <label className="text-sm text-mute">Size
              <select className="mt-1" value={mode} onChange={(e) => { setMode(e.target.value as "target" | "amount"); setPreview(null); }}>
                <option value="target">Target health factor</option>
                <option value="amount">Exact amount</option>
              </select>
            </label>
          </div>
          {mode === "target" ? (
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => { setTarget(preset.id); setPreview(null); }}
                  className={`rounded-2xl border px-3 py-3 text-left text-sm ${target === preset.id ? "border-acid bg-acid/10" : "border-line"}`}
                >
                  <div>{preset.label}</div>
                  <div className="text-xs text-mute">{preset.hint}</div>
                </button>
              ))}
            </div>
          ) : (
            <label className="block text-sm text-mute">Borrow amount
              <input className="mt-1" value={borrowAmount} onChange={(e) => { setBorrowAmount(e.target.value); setPreview(null); }} />
            </label>
          )}
          {error ? <p className="text-sm text-ember">{error}</p> : null}
          <button type="submit" disabled={busy} className="rounded-full bg-acid px-5 py-2.5 text-ink disabled:opacity-60">
            {busy ? "Modeling…" : "Model terms"}
          </button>
        </form>
        {preview ? (
          <motion.aside
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="paper rounded-3xl p-6 shadow-2xl"
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-ink2/60">Term sheet</div>
            <div className="mt-2 flex items-end justify-between gap-4">
              <div>
                <div className="text-sm">Borrow {amt(preview.borrowAmount)} {preview.borrowSymbol}</div>
                <div className="text-sm opacity-70">Post {amt(preview.collateralAmount)} {preview.collateralSymbol}</div>
              </div>
              <div className={`font-serif text-5xl ${preview.healthFactor && Number(preview.healthFactor) < 1.5 ? "text-ember" : ""}`}>
                {hfText(preview.healthFactor)}
              </div>
            </div>
            <dl className="mt-5 space-y-2 text-sm">
              <Row k="Health before" v={hfText(preview.healthFactorBefore)} />
              <Row k="Borrow APR" v={pct(preview.borrowApr)} />
              <Row k="Supply APR on collateral" v={pct(preview.supplyApr)} />
              <Row k="Collateral value" v={usd(preview.collateralUsd)} />
              <Row k="Debt value" v={usd(preview.debtUsd)} />
              <Row k="Liquidation price" v={preview.liquidationPriceUsd ? `${usd(preview.liquidationPriceUsd)} ${preview.liquidationSymbol}` : "—"} />
              <Row k="Drop to liquidation" v={pct(preview.dropToLiquidation, 1)} />
              <Row k="Interest 7d / 30d / 1y" v={`${amt(preview.projectedInterest.d7)} / ${amt(preview.projectedInterest.d30)} / ${amt(preview.projectedInterest.d365)} ${preview.borrowSymbol}`} />
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {preview.stress.map((row) => (
                <div key={row.id} className="rounded-xl bg-ink2/5 px-3 py-2">
                  <div>{row.label}</div>
                  <div className={row.liquidatable ? "text-ember" : ""}>HF {hfText(row.healthFactor)}{row.liquidatable ? " · liquidatable" : ""}</div>
                </div>
              ))}
            </div>
            {preview.clampedToLtv ? <p className="mt-3 text-sm">Size was clamped to the LTV cap.</p> : null}
            {preview.error ? <p className="mt-3 text-sm text-ember">{preview.error}</p> : null}
            <button type="button" disabled={!preview.ok || busy} onClick={commit} className="mt-5 w-full rounded-full bg-ink2 px-4 py-3 text-paper disabled:opacity-40">
              Commit simulated position
            </button>
          </motion.aside>
        ) : (
          <div className="rounded-3xl border border-dashed border-line p-6 text-mute">
            The term sheet appears here. Elevated targets a health factor under 1.50, which files a watch alert.
          </div>
        )}
      </div>
      {preview ? <p className={`mt-4 text-sm ${hfTone(preview.healthFactor)}`}>Modeled health factor {hfText(preview.healthFactor)}</p> : null}
    </Page>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-t border-ink2/10 py-1.5">
      <dt className="opacity-60">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
