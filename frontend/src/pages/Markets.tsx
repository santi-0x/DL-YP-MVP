import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Page, Title } from "../components/Ui";
import { age, amt, pct, usd } from "../format";
import type { Market } from "../types";

export function MarketsPage() {
  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const pull = () => {
      api<{ markets: Market[] }>("/api/markets")
        .then((res) => {
          if (!stop) {
            setMarkets(res.markets);
            setError(null);
          }
        })
        .catch((err: Error) => {
          if (!stop) setError(err.message);
        });
    };
    pull();
    const id = window.setInterval(pull, 15000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  const stale = markets?.some((market) => market.oracle.stale);

  return (
    <Page>
      <Title
        kicker="Markets"
        title="Lending book"
        lede="Live utilization sets the rate. TVL includes protocol liquidity so the pools can be borrowed against before outside deposits arrive."
      />
      {error ? <p className="mb-4 text-ember">{error}</p> : null}
      {stale ? <p className="mb-4 text-sm text-gold">At least one oracle print is older than one hour. New borrows are blocked.</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-line bg-panel/70">
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Price</th>
              <th>Supply APY</th>
              <th>Borrow APY</th>
              <th>TVL</th>
              <th>Utilization</th>
              <th>LTV / threshold</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(markets ?? []).map((market) => (
              <tr key={market.symbol}>
                <td>
                  <div className="font-medium">{market.symbol}</div>
                  <div className="text-xs text-mute">{market.name}{market.paused ? " · paused" : ""}</div>
                </td>
                <td>
                  <div>{usd(market.priceUsd)}</div>
                  <div className="text-xs text-mute">
                    <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${market.oracle.stale ? "bg-ember" : "bg-acid"}`} />
                    {market.oracle.source} · {age(market.oracle.ageMs)}
                  </div>
                </td>
                <td className="text-acid">{pct(market.supplyApr)}</td>
                <td>{pct(market.borrowApr)}</td>
                <td>
                  <div>{usd(market.tvlUsd)}</div>
                  <div className="text-xs text-mute">{amt(market.totalSupply)} {market.symbol}</div>
                </td>
                <td>
                  <div className="mb-1">{pct(market.utilization, 1)}</div>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
                    <div className="h-full bg-acid" style={{ width: `${Math.min(100, Number(market.utilization) * 100)}%` }} />
                  </div>
                </td>
                <td className="text-sm text-mute">{pct(market.ltv, 1)} / {pct(market.liquidationThreshold, 1)}</td>
                <td>
                  {market.isCollateral ? (
                    <Link className="text-sm text-acid" to={`/borrow?collateral=${market.symbol}&borrow=USDC`}>
                      Borrow
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!markets ? <p className="p-6 text-mute">Loading markets…</p> : null}
      </div>
    </Page>
  );
}
