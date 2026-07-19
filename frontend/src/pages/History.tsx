import { useEffect, useState } from "react";
import { api } from "../api";
import { Page, Title } from "../components/Ui";
import { amt, kindLabel, when } from "../format";
import type { HistoryEvent } from "../types";

export function HistoryPage() {
  const [events, setEvents] = useState<HistoryEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ events: HistoryEvent[] }>("/api/portfolio/history")
      .then((res) => setEvents(res.events))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <Page>
      <Title kicker="History" title="Ledger" lede="Deposits, borrows, repayments, and liquidations. Interest stays on the market index rather than as its own line." />
      {error ? <p className="text-ember">{error}</p> : null}
      <ol className="space-y-3">
        {(events ?? []).map((event) => (
          <li key={event.id} className="grid grid-cols-[9rem_1fr_auto] gap-3 rounded-2xl border border-line bg-panel/70 px-4 py-3 text-sm">
            <time className="text-mute">{when(event.createdAt)}</time>
            <div>
              <div>{kindLabel(event.kind, event.meta?.action)}</div>
              {event.meta?.healthFactor ? <div className="text-xs text-mute">Health factor {event.meta.healthFactor}</div> : null}
            </div>
            <div className="text-right tabular-nums">{event.amount ? `${amt(event.amount)} ${event.symbol ?? ""}` : event.symbol}</div>
          </li>
        ))}
      </ol>
      {events && events.length === 0 ? <p className="text-mute">No ledger events yet.</p> : null}
      {!events && !error ? <p className="text-mute">Loading history…</p> : null}
    </Page>
  );
}
