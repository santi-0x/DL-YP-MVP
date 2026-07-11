import { useEffect, useState } from "react";
import { api } from "../api";
import { Page, Title } from "../components/Ui";
import { when } from "../format";
import type { Notice } from "../types";

export function NotificationsPage() {
  const [rows, setRows] = useState<Notice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    return api<{ notifications: Notice[] }>("/api/notifications")
      .then((res) => setRows(res.notifications))
      .catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function read(id: string) {
    const res = await api<{ notifications: Notice[] }>("/api/notifications/read", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    setRows(res.notifications);
  }

  return (
    <Page>
      <div className="mb-6 flex items-end justify-between gap-4">
        <Title kicker="Alerts" title="Notifications" lede="Health-factor crossings and borrow-rate moves of 25 basis points or more." />
        <button type="button" className="mb-8 text-sm text-mute" onClick={() => read("all")}>Mark all read</button>
      </div>
      {error ? <p className="text-ember">{error}</p> : null}
      <div className="space-y-3">
        {(rows ?? []).map((row) => (
          <article key={row.id} className={`rounded-2xl border px-4 py-4 ${row.read ? "border-line bg-panel/40" : "border-gold/40 bg-panel"}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-2xl">{row.title}</h2>
              <time className="text-xs text-mute">{when(row.createdAt)}</time>
            </div>
            <p className="mt-2 text-sm text-mute">{row.body}</p>
            <div className="mt-2 text-xs uppercase tracking-[0.14em] text-mute">{row.kind.replaceAll("_", " ")}</div>
            {!row.read ? (
              <button type="button" className="mt-3 text-sm text-acid" onClick={() => read(row.id)}>Mark read</button>
            ) : null}
          </article>
        ))}
      </div>
      {rows && rows.length === 0 ? (
        <p className="text-mute">No alerts yet. An elevated borrow files a health-factor watch.</p>
      ) : null}
    </Page>
  );
}
