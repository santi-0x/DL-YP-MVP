import { motion } from "framer-motion";
import { useState } from "react";
import { api } from "../api";
import { Page, Title } from "../components/Ui";
import { hfText, pct, usd } from "../format";
import type { StressRow } from "../types";

type Report = {
  healthFactor: string | null;
  collateralUsd: string;
  debtUsd: string;
  oracleStale: boolean;
  scenarios: StressRow[];
};

export function StressPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setReport(await api<Report>("/api/simulate/stress", { method: "POST", body: "{}" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stress run failed");
    } finally {
      setBusy(false);
    }
  }

  const primary = report?.scenarios.filter((row) => row.group === "primary") ?? [];
  const historical = report?.scenarios.filter((row) => row.group === "historical") ?? [];

  return (
    <Page>
      <Title
        kicker="Stress"
        title="Shock the position"
        lede="10, 20, and 30 percent drawdowns, one correlated move, and a shelf of stylized historical shocks. Nothing here changes the book."
      />
      <button type="button" onClick={run} disabled={busy} className="rounded-full bg-acid px-5 py-2.5 text-ink disabled:opacity-60">
        {busy ? "Running…" : "Run stress"}
      </button>
      {error ? <p className="mt-4 text-ember">{error}</p> : null}
      {report ? (
        <>
          <p className="mt-6 text-sm text-mute">
            Starting health factor {hfText(report.healthFactor)} · collateral {usd(report.collateralUsd)} · debt {usd(report.debtUsd)}
            {report.oracleStale ? " · oracle stale" : ""}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {primary.map((row, index) => (
              <motion.article
                key={row.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-line bg-panel p-4"
              >
                <h2 className="font-serif text-2xl">{row.label}</h2>
                <p className="mt-1 text-xs text-mute">{row.detail}</p>
                <div className={`mt-4 font-serif text-4xl ${row.liquidatable ? "text-ember" : "text-acid"}`}>{hfText(row.healthFactor)}</div>
                <p className="mt-2 text-sm text-mute">30-day interest {usd(row.projectedInterest30d)}</p>
                <p className="text-sm text-mute">Bad debt {usd(row.badDebtUsd)} · drop left {pct(row.dropToLiquidation, 1)}</p>
              </motion.article>
            ))}
          </div>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-panel/70">
            <table>
              <thead>
                <tr>
                  <th>Shock</th>
                  <th>Health</th>
                  <th>Debt</th>
                  <th>30-day interest</th>
                  <th>Bad debt</th>
                </tr>
              </thead>
              <tbody>
                {historical.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div>{row.label}</div>
                      <div className="text-xs text-mute">{row.detail}</div>
                    </td>
                    <td className={row.liquidatable ? "text-ember" : ""}>{hfText(row.healthFactor)}{row.liquidatable ? " · liq" : ""}</td>
                    <td>{usd(row.debtUsd)}</td>
                    <td>{usd(row.projectedInterest30d)}</td>
                    <td>{usd(row.badDebtUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </Page>
  );
}
