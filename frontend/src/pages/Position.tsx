import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api";
import { Banner, Page, Stat, Title } from "../components/Ui";
import { amt, hfText, hfTone, pct, usd } from "../format";
import type { Portfolio } from "../types";

export function PositionPage() {
  const location = useLocation();
  const flash = (location.state as { flash?: string } | null)?.flash;
  const [book, setBook] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(flash ?? null);

  function load() {
    return api<Portfolio>("/api/portfolio").then(setBook).catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Page>
      <Title kicker="Position" title="Your book" lede="Collateral, debt, and the price that would liquidate the largest posted asset." />
      {notice ? <Banner tone="ok">{notice}</Banner> : null}
      {error ? <p className="mb-4 text-ember">{error}</p> : null}
      {book?.oracleStale ? <Banner tone="warn">Oracle prices are stale. Withdrawals and new borrows are blocked until a fresh print arrives.</Banner> : null}
      {book ? (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="rounded-3xl border border-line bg-panel px-6 py-5">
              <div className="text-[11px] uppercase tracking-[0.16em] text-mute">Health factor</div>
              <div className={`font-serif text-7xl leading-none ${hfTone(book.healthFactor, book.liquidatable)}`}>{hfText(book.healthFactor)}</div>
              <p className="mt-3 text-sm text-mute">
                {book.liquidatable ? "Below 1. A liquidation replay can close this." : "Above 1.50 is outside the watch level."}
              </p>
            </div>
            <Stat label="Collateral" value={usd(book.collateralUsd)} />
            <Stat label="Debt" value={usd(book.debtUsd)} />
            <Stat label="Borrow power used" value={book.borrowPowerUsed ? pct(book.borrowPowerUsed, 1) : "—"} hint={`${usd(book.borrowPowerUsd)} capacity`} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-line bg-panel/70 p-4">
              <h2 className="mb-3 font-serif text-2xl">Collateral</h2>
              {book.supplies.length === 0 ? <p className="text-sm text-mute">No deposits yet. <Link className="text-acid" to="/borrow">Open a simulated loan.</Link></p> : null}
              {book.supplies.map((row) => (
                <div key={row.symbol} className="flex items-start justify-between gap-4 border-t border-line py-3 text-sm">
                  <div>
                    <div className="text-base">{row.symbol}</div>
                    <div className="text-mute">{row.collateral ? "Posted" : "Supplied, not collateral"} · earn {pct(row.apr)}</div>
                    {row.liquidationPriceUsd ? (
                      <div className="text-mute">Liquidation near {usd(row.liquidationPriceUsd)} · {pct(row.dropToLiquidation, 1)} of price</div>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div>{amt(row.amount)}</div>
                    <div className="text-mute">{usd(row.amountUsd)}</div>
                  </div>
                </div>
              ))}
              <ActionForm
                title="Supply"
                onSubmit={async (symbol, amount) => {
                  const next = await api<Portfolio>("/api/positions/supply", { method: "POST", body: JSON.stringify({ symbol, amount }) });
                  setBook(next);
                  setNotice(`Supplied ${amount} ${symbol}.`);
                }}
                symbols={book.supplies.map((row) => row.symbol).concat(["ETH", "BTC", "WBTC", "LINK", "USDC"]).filter((v, i, a) => a.indexOf(v) === i)}
              />
              <ActionForm
                title="Withdraw"
                onSubmit={async (symbol, amount) => {
                  const next = await api<Portfolio>("/api/positions/withdraw", { method: "POST", body: JSON.stringify({ symbol, amount }) });
                  setBook(next);
                  setNotice(`Withdrew ${amount} ${symbol}.`);
                }}
                symbols={book.supplies.map((row) => row.symbol)}
              />
            </section>
            <section className="rounded-2xl border border-line bg-panel/70 p-4">
              <h2 className="mb-3 font-serif text-2xl">Debt</h2>
              {book.borrows.length === 0 ? <p className="text-sm text-mute">No open debt.</p> : null}
              {book.borrows.map((row) => (
                <div key={row.symbol} className="flex items-start justify-between gap-4 border-t border-line py-3 text-sm">
                  <div>
                    <div className="text-base">{row.symbol}</div>
                    <div className="text-mute">Borrow {pct(row.apr)} · mark {usd(row.priceUsd)}</div>
                  </div>
                  <div className="text-right">
                    <div>{amt(row.amount)}</div>
                    <div className="text-mute">{usd(row.amountUsd)}</div>
                  </div>
                </div>
              ))}
              <ActionForm
                title="Repay"
                onSubmit={async (symbol, amount) => {
                  const next = await api<Portfolio>("/api/positions/repay", { method: "POST", body: JSON.stringify({ symbol, amount }) });
                  setBook(next);
                  setNotice(`Repaid ${amount} ${symbol}.`);
                }}
                symbols={book.borrows.map((row) => row.symbol)}
              />
              <Link to="/borrow" className="mt-4 inline-block text-sm text-acid">Model another loan</Link>
            </section>
          </div>
        </>
      ) : (
        <p className="text-mute">Loading the position…</p>
      )}
    </Page>
  );
}

function ActionForm({
  title,
  symbols,
  onSubmit,
}: {
  title: string;
  symbols: string[];
  onSubmit: (symbol: string, amount: string) => Promise<void>;
}) {
  const [symbol, setSymbol] = useState(symbols[0] ?? "ETH");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (symbols.length === 0) return null;
  return (
    <form
      className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await onSubmit(symbol, amount);
          setAmount("");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Action failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
        {symbols.map((item) => <option key={item}>{item}</option>)}
      </select>
      <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <button type="submit" disabled={busy} className="rounded-full border border-line px-4 text-sm">
        {busy ? "…" : title}
      </button>
      {error ? <p className="col-span-3 text-sm text-ember">{error}</p> : null}
    </form>
  );
}
