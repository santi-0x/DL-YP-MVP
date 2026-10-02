# Fathom — Web2 lending desk

Simulated overcollateralized lending. The home page and the sign-in page use the official Paramount trailer for *The Big Short* as the background. That film is about collateral and a credit book the market mispriced. The Web2 desk is complete. The Web3 contracts are not deployed. Markets, positions, borrow terms, stress shocks, alerts, and an ops console all run against this API. There is no wallet, no chain, and no live liquidation keeper.

The root `package.json` sets `"type": "module"`. The API is plain JavaScript in `backend/src`. The React app stays TypeScript and is bundled by Vite.

## Ports

| Service   | URL                        |
| --------- | -------------------------- |
| Web       | http://localhost:5173      |
| API       | http://localhost:4000      |
| Postgres  | localhost:5432             |
| Redis     | localhost:6379             |

## Demo login

- Email: `demo@lending.dev`
- Password: `demopass123`
- Role: admin, so the Ops nav item is available

The seed opens a position of **4 ETH collateral** and **2,000 USDC debt**. Protocol treasury liquidity is also seeded so utilization and APYs are already non-zero.

## Database

Postgres is the Neon project `withered-glade-38943361`, branch `production` (AWS US East 2). The connection strings are in `backend/.env`. Prisma keeps its own pool and adds `pgbouncer=true` on the pooled host. Schema changes use the direct URL.

Redis is an optional price cache (`REDIS_URL` in `backend/.env`). If nothing is listening on that URL, the API keeps prices in memory and keeps running. Login stays the app's own JWT accounts.

## Run with Docker

Requires Node.js 18+ and Docker.

```bash
docker compose up -d
cp backend/.env.example backend/.env   # defaults match the compose file
npm run dev
```

`npm run db:setup` creates the tables and reseeds. Re-running it wipes desk data and restores the demo user.

API tests:

```bash
npm test
```

## Run without Docker

Postgres is the Neon database in `backend/.env`. Redis on `127.0.0.1:6379` is optional.

```bash
# example on Ubuntu, if the service manager is not running them
sudo pg_ctlcluster 16 main start
redis-server --daemonize yes --bind 127.0.0.1 --port 6379

sudo -u postgres psql -c "CREATE ROLE lend LOGIN PASSWORD 'lend' SUPERUSER;"
sudo -u postgres psql -c "CREATE DATABASE lend OWNER lend;"
```

Then the same `npm install`, `npm run db:setup`, and `npm run dev` commands as above. This VM has no Docker daemon, so the app here was started that way.

There is one `package.json`, at the repo root. `npm run dev` installs the packages, including concurrently, then starts the Node API on port 4000 and the React app on port 5173 together. Postgres is the Neon database named in `backend/.env`. A Postgres install on the PC is not required. Redis is a cache; the desk still runs if it is not installed.

The Vite server proxies `/api` to the API.

## Prices

The oracle tries, in order:

1. CoinGecko public `simple/price` (no API key) for ETH, BTC, WBTC, LINK, and USDC
2. Coinbase public spot, per asset, if CoinGecko did not return it
3. The last cached print
4. Seed prices, only when that asset has never had a print

On this machine CoinGecko returned all five assets. Seed prices, used only as a fallback, are ETH 3500, BTC 98000, WBTC 97920, LINK 18.40, USDC 1.00.

Every print is timestamped. A price older than **one hour** is stale. Stale prices still display, and they block new borrows and withdrawals. Ops can refresh the feed, move timestamps back to demonstrate staleness, or write a price shock through the same path.

WBTC is its own market, with a tighter LTV than BTC. It is not an alias of the BTC price.

## What the desk does

- **Markets** — supply APY, borrow APY, TVL, utilization. Rates come from a kinked utilization curve and accrue on a ray index.
- **Position** — collateral, debt, health factor, liquidation price. Supply, withdraw, and repay post to the API.
- **Borrow** — model terms (health factor, liquidation price, interest at 1/7/30/365 days, and the 10/20/30% plus correlated shocks) and then commit a simulated position. No tokens move.
- **Stress** — those four shocks plus 23 stylized historical moves. Read-only.
- **Alerts** — health factor under 1.50, 1.20, and 1.00, and borrow APR moves of at least 25 bps.
- **History** — deposits, borrows, repayments, liquidations.
- **Ops** — edit risk parameters inside bounds, dry-run them against every account, analytics, users, oracle controls, and a manual liquidation replay.

An elevated borrow (target health factor 1.35) files the watch alert. Liquidation replay only closes accounts already below a health factor of 1, and it can book bad debt against protocol treasury when collateral cannot cover the debt.

## Gaps versus the Web2 overview

- No Chainlink feed. There is no chain to read. CoinGecko, then Coinbase, then seed prices share one staleness clock (1 hour).
- The ledger is an application log. Replaying its scaled deltas reconstructs current balances. It is not a chain indexer and does not handle reorgs.
- Liquidation is a button in Ops, not a live keeper.
- Each user has one cross-margin account. Isolated markets are not built.
- Math is JavaScript wad/ray fixed-point, not EVM arithmetic. USDC is counted in whole tokens, not 6-decimal ERC-20 units.
- Engine tests cover the rate curve, accrual, health factor, liquidation, bad debt, the 1 hour stale rule, and the shock set. The HTTP layer is not under a 100% branch-coverage gate.
- Helmet, CORS, JWT, and rate limits are on the API. This workspace is a local run, not a production deploy.
