import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] as const }}>
      {children}
    </motion.div>
  );
}

export function Title({ kicker, title, lede }: { kicker: string; title: string; lede?: string }) {
  return (
    <header className="mb-8">
      <div className="text-[11px] uppercase tracking-[0.22em] text-mute">{kicker}</div>
      <h1 className="font-serif text-4xl mt-1 leading-none">{title}</h1>
      {lede ? <p className="mt-3 max-w-2xl text-mute">{lede}</p> : null}
    </header>
  );
}

export function Banner({ tone, children }: { tone: "warn" | "bad" | "ok"; children: ReactNode }) {
  const cls = tone === "bad" ? "border-ember/50 text-ember" : tone === "warn" ? "border-gold/50 text-gold" : "border-acid/40 text-acid";
  return <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-white bg-white/85 px-4 py-3 shadow-[0_16px_40px_-28px_rgba(160,70,20,0.45)]">
      <div className="text-[11px] uppercase tracking-[0.16em] text-mute">{label}</div>
      <div className="mt-1 font-serif text-2xl tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-mute">{hint}</div> : null}
    </motion.div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-ember">{children}</p>;
}
