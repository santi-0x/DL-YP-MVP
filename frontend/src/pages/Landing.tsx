import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { FilmBackdrop } from "../components/FilmBackdrop";

const features = [
  {
    to: "/markets",
    kicker: "Markets",
    title: "Live rates, TVL, utilization",
    body: "Each asset has a kinked utilization curve. Supply APY, borrow APY, and pool size update from the book.",
  },
  {
    to: "/position",
    kicker: "Position",
    title: "Collateral, debt, health",
    body: "The dashboard shows health factor, borrow power, and the price that would liquidate the largest posted asset.",
  },
  {
    to: "/borrow",
    kicker: "Borrow",
    title: "Terms before you commit",
    body: "Model a loan, read interest at 1, 7, 30, and 365 days, then post a simulated position. No tokens move.",
  },
  {
    to: "/stress",
    kicker: "Stress",
    title: "Shocks on the same book",
    body: "10, 20, and 30 percent drawdowns, a correlated move, and 23 stylized historical shocks.",
  },
  {
    to: "/history",
    kicker: "History",
    title: "Every ledger line",
    body: "Deposits, borrows, repayments, and liquidations stay on the account.",
  },
  {
    to: "/notifications",
    kicker: "Alerts",
    title: "Health and rate watches",
    body: "Alerts fire under health 1.50, 1.20, and 1.00, and when borrow APR moves by at least 25 bps.",
  },
  {
    to: "/login",
    kicker: "Accounts",
    title: "Sessions on this desk",
    body: "JWT login, bcrypt passwords, and a demo admin that can open the operations console.",
  },
  {
    to: "/ops",
    kicker: "Operations",
    title: "Parameters, users, oracle",
    body: "Edit risk inside bounds, dry-run the change on every account, and replay a liquidation that is already under water.",
  },
];

const ticker = ["ETH", "BTC", "WBTC", "LINK", "USDC", "Health factor", "Utilization", "Liquidation price", "1 hour oracle", "10 / 20 / 30% shocks"];

const rise = {
  hidden: { opacity: 0, y: 22 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * index, duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function LandingPage() {
  const { user } = useAuth();
  const desk = user ? "/markets" : "/login";

  return (
    <FilmBackdrop>
      <header className="relative mx-auto flex max-w-6xl items-center gap-4 px-4 py-5 md:px-6">
        <Link to="/" className="font-serif text-3xl leading-none">Fathom</Link>
        <nav className="hidden items-center gap-5 text-sm text-ink2/80 md:flex">
          <a href="#film" className="hover:text-ink2">The Big Short</a>
          <a href="#desk" className="hover:text-ink2">The desk</a>
          <a href="#scope" className="hover:text-ink2">What is built</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Link to="/markets" className="rounded-full bg-ink2 px-4 py-2 text-sm text-paper">Open the desk</Link>
          ) : (
            <>
              <Link to="/login" className="rounded-full px-4 py-2 text-sm text-ink2">Sign in</Link>
              <Link to="/register" className="rounded-full bg-ink2 px-4 py-2 text-sm text-paper">Create account</Link>
            </>
          )}
        </div>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-end gap-10 px-4 pb-8 pt-6 md:grid-cols-[1.15fr_0.85fr] md:px-6 md:pt-10">
        <motion.div initial="hidden" animate="show" className="rounded-[28px] bg-[#fff4ea]/75 p-6 backdrop-blur-md">
          <motion.p custom={0} variants={rise} className="text-[11px] uppercase tracking-[0.22em] text-gold">
            Web2 MVP · complete
          </motion.p>
          <motion.h1 custom={1} variants={rise} className="mt-3 max-w-xl font-serif text-5xl leading-[0.92] md:text-7xl">
            Credit against live crypto collateral.
          </motion.h1>
          <motion.p custom={2} variants={rise} className="mt-5 max-w-lg text-lg text-mute">
            Fathom is the finished application layer of an overcollateralized lending protocol. Deposit, borrow, watch the health factor, and stress the book. Prices come from the public market. Nothing here is a deployed contract.
          </motion.p>
          <motion.div custom={3} variants={rise} className="mt-7 flex flex-wrap gap-3">
            <Link to={desk} className="rounded-full bg-acid px-5 py-3 text-sm text-white">
              {user ? "Continue into the desk" : "Enter the desk"}
            </Link>
            <a href="#desk" className="rounded-full border border-line bg-white/70 px-5 py-3 text-sm">
              See the eight functions
            </a>
          </motion.div>
        </motion.div>
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_30px_80px_-40px_rgba(180,70,20,0.55)] backdrop-blur"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-mute">On this desk today</p>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              ["Collateral", "ETH, BTC, WBTC, LINK, USDC"],
              ["Oracle", "CoinGecko, then Coinbase, stale after 1 hour"],
              ["Liquidation bonus", "Set per market, replayed in Ops"],
              ["Demo", "demo@lending.dev · demopass123"],
            ].map(([label, value]) => (
              <li key={label} className="flex items-baseline justify-between gap-4 border-b border-line/80 pb-3">
                <span className="text-mute">{label}</span>
                <span className="text-right">{value}</span>
              </li>
            ))}
          </ul>
        </motion.aside>
      </section>

      <div className="relative mt-4 border-y border-line/80 bg-white/50 py-3">
        <div className="ticker flex w-max gap-8 text-sm uppercase tracking-[0.18em] text-ink2/70">
          {[...ticker, ...ticker].map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </div>

      <section id="desk" className="relative mx-auto max-w-6xl px-4 pb-8 md:px-6">
        <div className="mb-8 max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-mute">Platform overview</p>
          <h2 className="mt-2 font-serif text-4xl leading-none md:text-5xl">Eight functions, all in this build.</h2>
          <p className="mt-4 text-mute">
            Lenders earn variable yield. Borrowers post collateral and draw a loan. Operators set risk inside bounds. Liquidation is a replay on this desk, not a public keeper.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((feature, index) => (
            <motion.div
              key={feature.to + feature.kicker}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: (index % 2) * 0.08, duration: 0.45 }}
              whileHover={{ y: -4 }}
            >
              <Link to={feature.to} className="group block h-full rounded-[24px] border border-white bg-white/80 p-5 shadow-[0_18px_50px_-32px_rgba(160,70,20,0.45)]">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em]">
                  <span className="text-mute">{feature.kicker}</span>
                  <span className="rounded-full bg-[#e7f8f2] px-2 py-1 text-[#0c7a62]">In the MVP</span>
                </div>
                <h3 className="mt-3 font-serif text-3xl leading-none group-hover:text-acid">{feature.title}</h3>
                <p className="mt-3 text-sm text-mute">{feature.body}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="scope" className="relative mx-auto grid max-w-6xl gap-4 px-4 py-16 md:grid-cols-2 md:px-6">
        <div className="rounded-[28px] bg-[#1c140e] p-7 text-[#fff6ec]">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#ffb088]">Built</p>
          <h2 className="mt-3 font-serif text-4xl">The simulation desk</h2>
          <ul className="mt-5 space-y-2 text-sm text-[#f3e4d4]">
            <li>Market discovery, position dashboard, and borrow terms.</li>
            <li>Risk shocks, account history, and health alerts.</li>
            <li>JWT accounts and an operations console.</li>
            <li>Live non-stablecoin prices with a one-hour stale rule.</li>
            <li>Fixed-point interest, health factor, and bad-debt accounting.</li>
          </ul>
        </div>
        <div className="rounded-[28px] border border-dashed border-[#e7b89a] bg-white/60 p-7">
          <p className="text-[11px] uppercase tracking-[0.2em] text-mute">Not this site</p>
          <h2 className="mt-3 font-serif text-4xl">The Web3 layer</h2>
          <p className="mt-4 text-sm text-mute">
            The overview funds a later contract phase. It is not in the running app, and this page does not pretend otherwise.
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            <li>No deployed markets, no wallet, no on-chain position.</li>
            <li>No permissionless keeper and no governance vote.</li>
            <li>No Chainlink feed. There is no chain to read.</li>
          </ul>
        </div>
      </section>

      <footer id="film" className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-12 text-xs text-mute md:px-6">
        <span>
          Background: The Big Short, official Paramount trailer.{" "}
          <a className="underline decoration-acid/50 underline-offset-2" href="https://www.youtube.com/watch?v=vgqG3ITMv1Q" target="_blank" rel="noreferrer">
            YouTube
          </a>
        </span>
        <Link to={desk} className="text-ink2 underline decoration-acid/50 underline-offset-4">
          {user ? "Back to markets" : "Sign in to the demo"}
        </Link>
      </footer>
    </FilmBackdrop>
  );
}
