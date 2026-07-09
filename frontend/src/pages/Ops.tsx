import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Page, Stat, Title } from "../components/Ui";
import { pct, usd } from "../format";
import type { DeskUser, Market } from "../types";

type Analytics = {
  tvlUsd: string;
  totalBorrowUsd: string;
  realizedLossUsd: string;
  users: number;
  openSupplies: number;
  openBorrows: number;
  events24h: number;
  oracle: { result: string; detail: string };
  markets: Market[];
};

type SimResult = {
  liquidatable: number;
  users: { email: string; healthFactorBefore: string | null; healthFactorAfter: string | null; liquidatableAfter: boolean }[];
};

export function OpsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<DeskUser[]>([]);
  const [symbol, setSymbol] = useState("ETH");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sim, setSim] = useState<SimResult | null>(null);
  const [form, setForm] = useState({ ltv: "75", lt: "82.5", bonus: "5", reserve: "10", slope1: "2.8", paused: false });

  function load() {
    return Promise.all([
      api<Analytics>("/api/admin/analytics"),
      api<{ users: DeskUser[] }>("/api/admin/users"),
    ]).then(([analytics, roster]) => {
      setData(analytics);
      setUsers(roster.users);
    }).catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    if (user?.role === "ADMIN") load();
  }, [user?.role]);

  useEffect(() => {
    const market = data?.markets.find((item) => item.symbol === symbol);
    if (!market) return;
    setForm({
      ltv: (market.ltvBps / 100).toString(),
      lt: (market.liquidationThresholdBps / 100).toString(),
      bonus: (market.liquidationBonusBps / 100).toString(),
      reserve: (market.reserveFactorBps / 100).toString(),
      slope1: (market.slope1AprBps / 100).toString(),
      paused: market.paused,
    });
    setSim(null);
  }, [symbol, data]);

  if (user && user.role !== "ADMIN") return <Navigate to="/markets" replace />;

  function bps(percent: string) {
    return Math.round(Number(percent) * 100);
  }

  async function save() {
    setError(null);
    try {
      await api(`/api/admin/markets/${symbol}`, {
        method: "PATCH",
        body: JSON.stringify({
          ltvBps: bps(form.ltv),
          liquidationThresholdBps: bps(form.lt),
          liquidationBonusBps: bps(form.bonus),
          reserveFactorBps: bps(form.reserve),
          slope1AprBps: bps(form.slope1),
          paused: form.paused,
        }),
      });
      setNote(`${symbol} parameters saved.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function simulate() {
    setError(null);
    try {
      setSim(await api<SimResult>(`/api/admin/markets/${symbol}/simulate`, {
        method: "POST",
        body: JSON.stringify({
          ltvBps: bps(form.ltv),
          liquidationThresholdBps: bps(form.lt),
          liquidationBonusBps: bps(form.bonus),
        }),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    }
  }

  async function act(path: string, body?: unknown, message?: string) {
    setError(null);
    try {
      await api(path, { method: "POST", body: body === undefined ? "{}" : JSON.stringify(body) });
      setNote(message ?? "Done");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <Page>
      <Title kicker="Operations" title="Desk console" lede="Market parameters, a dry-run of those parameters, oracle health, and the user roster." />
      {error ? <p className="mb-4 text-ember">{error}</p> : null}
      {note ? <p className="mb-4 text-sm text-acid">{note}</p> : null}
      {data ? (
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="TVL" value={usd(data.tvlUsd)} />
          <Stat label="Borrows" value={usd(data.totalBorrowUsd)} />
          <Stat label="Realized loss" value={usd(data.realizedLossUsd)} />
          <Stat label="Users" value={String(data.users)} hint={`${data.events24h} events in 24h`} />
        </div>
      ) : <p className="text-mute">Loading the console…</p>}

      <section className="mb-8 rounded-3xl border border-line bg-panel p-5">
        <h2 className="font-serif text-3xl">Oracle</h2>
        <p className="mt-2 text-sm text-mute">{data ? `${data.oracle.result} — ${data.oracle.detail}` : ""}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rounded-full bg-acid px-4 py-2 text-ink" onClick={() => act("/api/admin/oracle/refresh", {}, "Feed refreshed.")}>Refresh feed</button>
          <button type="button" className="rounded-full border border-line px-4 py-2" onClick={() => act("/api/admin/oracle/stall", { minutes: 90 }, "Oracle timestamps moved back 90 minutes.")}>Stall 90 minutes</button>
          <button type="button" className="rounded-full border border-line px-4 py-2" onClick={() => act("/api/admin/oracle/overlay", { deltas: { ETH: -15, BTC: -15, WBTC: -16, LINK: -20 } }, "Price shock written through the oracle.")}>Apply 15% shock</button>
          <button type="button" className="rounded-full border border-line px-4 py-2" onClick={() => act("/api/admin/oracle/overlay", { deltas: null }, "Shock cleared.")}>Clear shock</button>
          <button type="button" className="rounded-full border border-ember px-4 py-2 text-ember" onClick={() => act("/api/admin/liquidations/replay", {}, "Liquidation replay finished.")}>Replay liquidations</button>
        </div>
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <div className="space-y-2">
          {(data?.markets ?? []).map((market) => (
            <button key={market.symbol} type="button" onClick={() => setSymbol(market.symbol)} className={`block w-full rounded-2xl border px-4 py-3 text-left ${symbol === market.symbol ? "border-acid" : "border-line"}`}>
              <div>{market.symbol}</div>
              <div className="text-xs text-mute">{pct(market.utilization, 1)} util · {pct(market.borrowApr)} borrow</div>
            </button>
          ))}
        </div>
        <form className="rounded-3xl border border-line bg-panel p-5" onSubmit={(event) => { event.preventDefault(); save(); }}>
          <h2 className="font-serif text-3xl">{symbol} parameters</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Max LTV %" value={form.ltv} onChange={(ltv) => setForm({ ...form, ltv })} />
            <Field label="Liquidation threshold %" value={form.lt} onChange={(lt) => setForm({ ...form, lt })} />
            <Field label="Liquidation bonus %" value={form.bonus} onChange={(bonus) => setForm({ ...form, bonus })} />
            <Field label="Reserve factor %" value={form.reserve} onChange={(reserve) => setForm({ ...form, reserve })} />
            <Field label="Slope 1 APR %" value={form.slope1} onChange={(slope1) => setForm({ ...form, slope1 })} />
            <label className="flex items-center gap-2 text-sm text-mute">
              <input type="checkbox" className="h-4 w-auto" checked={form.paused} onChange={(e) => setForm({ ...form, paused: e.target.checked })} />
              Paused
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="rounded-full bg-acid px-4 py-2 text-ink">Save</button>
            <button type="button" className="rounded-full border border-line px-4 py-2" onClick={simulate}>Simulate on the book</button>
          </div>
          {sim ? (
            <div className="mt-4 text-sm">
              <p>{sim.liquidatable} account{sim.liquidatable === 1 ? "" : "s"} would be liquidatable.</p>
              <ul className="mt-2 space-y-1 text-mute">
                {sim.users.map((row) => (
                  <li key={row.email}>{row.email}: {row.healthFactorBefore ?? "clear"} → {row.healthFactorAfter ?? "clear"}{row.liquidatableAfter ? " · liquidatable" : ""}</li>
                ))}
              </ul>
            </div>
          ) : <p className="mt-4 text-sm text-mute">Simulation does not save. It reprices every account under the draft LTV, threshold, and bonus.</p>}
        </form>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-line bg-panel/70">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Positions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((account) => (
              <tr key={account.id}>
                <td>
                  <div>{account.email}</div>
                  <div className="text-xs text-mute">{account.disabled ? "disabled" : "active"}</div>
                </td>
                <td>{account.role}</td>
                <td className="text-mute">{account.supplies} supplied · {account.borrows} borrowed</td>
                <td className="space-x-3 text-sm">
                  <button type="button" className="text-acid" onClick={async () => {
                    await api(`/api/admin/users/${account.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ role: account.role === "ADMIN" ? "USER" : "ADMIN" }),
                    });
                    await load();
                  }}>Toggle role</button>
                  <button type="button" className="text-gold" onClick={async () => {
                    await api(`/api/admin/users/${account.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ disabled: !account.disabled }),
                    });
                    await load();
                  }}>Toggle access</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Page>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm text-mute">
      {label}
      <input className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
