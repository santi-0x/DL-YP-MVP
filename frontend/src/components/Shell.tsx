import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

const links = [
  ["/", "Overview"],
  ["/markets", "Markets"],
  ["/position", "Position"],
  ["/borrow", "Borrow"],
  ["/stress", "Stress"],
  ["/history", "History"],
];

export function Shell() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let stop = false;
    const pull = () => {
      api<{ unread: number }>("/api/notifications")
        .then((res) => {
          if (!stop) setUnread(res.unread);
        })
        .catch(() => undefined);
    };
    pull();
    const id = window.setInterval(pull, 12000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-[#fff4ea]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 md:px-6">
          <NavLink to="/" className="font-serif text-3xl leading-none tracking-tight">
            Fathom
          </NavLink>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 ${isActive ? "bg-bone text-ink" : "text-mute hover:text-bone"}`
                }
              >
                {label}
              </NavLink>
            ))}
            {user?.role === "ADMIN" ? (
              <NavLink
                to="/ops"
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 ${isActive ? "bg-acid text-ink" : "text-mute hover:text-bone"}`
                }
              >
                Ops
              </NavLink>
            ) : null}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <NavLink to="/notifications" className="rounded-full border border-line px-3 py-1.5 text-mute hover:text-bone">
              Alerts{unread > 0 ? <span className="ml-2 text-gold">{unread}</span> : null}
            </NavLink>
            <span className="hidden text-mute sm:inline">{user?.email}</span>
            <button type="button" onClick={logout} className="text-mute hover:text-bone">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-mute md:px-6">
        Simulated books. No wallet, no chain, no keeper.
      </footer>
    </div>
  );
}
