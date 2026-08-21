import { ORACLE_STALE_MS, formatUnits, oracleStatus, parseUnits } from "../engine/money.js";
import { prisma } from "../lib/prisma.js";
import { cache } from "../lib/redis.js";
const REDIS_KEY = "oracle:prices";
let memory = null;
let base = null;
let overlay = null;
let report = { result: "cold", detail: "Prices have not been loaded", at: 0 };
function quantize(usd) {
    if (!Number.isFinite(usd) || usd <= 0)
        throw new Error("price must be positive");
    const priceUsd = usd.toFixed(8).replace(/\.?0+$/, "");
    return { priceUsd, priceWad: parseUnits(priceUsd).toString() };
}
function make(symbol, usd, source, updatedAt) {
    const priced = quantize(usd);
    return { symbol, ...priced, source, updatedAt };
}
export function presentQuote(quote, now = Date.now()) {
    const status = oracleStatus(quote.updatedAt, now);
    return {
        source: quote.source,
        updatedAt: new Date(quote.updatedAt).toISOString(),
        ageMs: status.ageMs,
        stale: status.stale,
        staleAfterMs: status.staleAfterMs,
        priceUsd: quote.priceUsd,
        priceWad: quote.priceWad,
    };
}
export function getIngestReport() {
    return report;
}
export async function getBook() {
    if (memory && Object.keys(memory).length > 0)
        return memory;
    const raw = await cache((client) => client.get(REDIS_KEY));
    if (!raw)
        return {};
    memory = JSON.parse(raw);
    return memory;
}
async function publish(book, snapshot) {
    memory = book;
    await cache((client) => client.set(REDIS_KEY, JSON.stringify(book)));
    if (!snapshot)
        return;
    const rows = Object.values(book);
    if (rows.length === 0)
        return;
    await prisma.priceSnapshot.createMany({
        data: rows.map((quote) => ({ symbol: quote.symbol, priceWad: quote.priceWad, source: quote.source })),
    });
    await prisma.priceSnapshot.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) } },
    });
}
function applyOverlay(source, deltas, now) {
    const next = {};
    for (const quote of Object.values(source)) {
        const delta = deltas[quote.symbol] ?? 0;
        const usd = Number(quote.priceUsd) * (1 + delta / 100);
        next[quote.symbol] = make(quote.symbol, usd, "overlay", now);
    }
    return next;
}
async function pullCoinGecko(ids) {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`;
    const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { accept: "application/json" },
    });
    if (!res.ok)
        throw new Error(`CoinGecko HTTP ${res.status}`);
    const body = (await res.json());
    const out = {};
    for (const [id, row] of Object.entries(body)) {
        if (typeof row?.usd === "number" && row.usd > 0)
            out[id] = row.usd;
    }
    return out;
}
async function pullCoinbase(pair) {
    const res = await fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`, {
        signal: AbortSignal.timeout(8000),
        headers: { accept: "application/json" },
    });
    if (!res.ok)
        return null;
    const body = (await res.json());
    const amount = Number(body.data?.amount);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
}
export async function ingest() {
    const markets = await prisma.market.findMany({ orderBy: { symbol: "asc" } });
    const previous = base ?? (await getBook());
    const errors = [];
    let gecko = {};
    try {
        gecko = await pullCoinGecko([...new Set(markets.map((market) => market.coingeckoId))]);
    }
    catch (error) {
        errors.push(error instanceof Error ? error.message : "CoinGecko failed");
    }
    const now = Date.now();
    const fetched = {};
    let geckoCount = 0;
    let coinbaseCount = 0;
    let seedCount = 0;
    let keptCount = 0;
    for (const market of markets) {
        const live = gecko[market.coingeckoId];
        if (live) {
            fetched[market.symbol] = make(market.symbol, live, "coingecko", now);
            geckoCount += 1;
            continue;
        }
        try {
            const spot = await pullCoinbase(market.coinbasePair);
            if (spot) {
                fetched[market.symbol] = make(market.symbol, spot, "coinbase", now);
                coinbaseCount += 1;
                continue;
            }
        }
        catch (error) {
            errors.push(`${market.symbol}: ${error instanceof Error ? error.message : "coinbase failed"}`);
        }
        if (previous[market.symbol]) {
            fetched[market.symbol] = previous[market.symbol];
            keptCount += 1;
            continue;
        }
        fetched[market.symbol] = make(market.symbol, Number(market.seedPriceUsd), "seed", now);
        seedCount += 1;
    }
    base = fetched;
    const published = overlay ? applyOverlay(fetched, overlay, now) : fetched;
    await publish(published, true);
    let result = "mixed";
    if (overlay)
        result = "overlay";
    else if (geckoCount === markets.length)
        result = "coingecko";
    else if (coinbaseCount === markets.length)
        result = "coinbase";
    else if (seedCount === markets.length)
        result = "seed";
    else if (keptCount === markets.length && geckoCount === 0 && coinbaseCount === 0 && seedCount === 0)
        result = "cached";
    const detail = [
        `coingecko ${geckoCount}`,
        `coinbase ${coinbaseCount}`,
        `seed ${seedCount}`,
        `cached ${keptCount}`,
        errors.length ? errors.join("; ") : "ok",
    ].join(" · ");
    report = { result, detail, at: now };
    console.log(`oracle ${result}: ${detail}`);
    return report;
}
export async function stallOracle(minutes) {
    const book = await getBook();
    const shiftedAt = Date.now() - minutes * 60 * 1000;
    const next = {};
    for (const quote of Object.values(book))
        next[quote.symbol] = { ...quote, updatedAt: shiftedAt };
    await publish(next, false);
    report = {
        result: report.result,
        detail: `timestamps moved back ${minutes}m (stale after ${ORACLE_STALE_MS / 60000}m)`,
        at: Date.now(),
    };
}
export async function setOverlay(deltas) {
    overlay = deltas;
    if (!base)
        base = await getBook();
    if (!deltas) {
        overlay = null;
        if (Object.keys(base).length > 0)
            await publish(base, false);
        report = { result: "cached", detail: "overlay cleared", at: Date.now() };
        return;
    }
    await publish(applyOverlay(base, deltas, Date.now()), true);
    report = { result: "overlay", detail: "shock written through the oracle path", at: Date.now() };
}
export async function priceWadMap() {
    const book = await getBook();
    const out = {};
    for (const quote of Object.values(book))
        out[quote.symbol] = BigInt(quote.priceWad);
    return out;
}
export function anyStale(book, symbols, now = Date.now()) {
    return symbols.some((symbol) => {
        const quote = book[symbol];
        if (!quote)
            return true;
        return oracleStatus(quote.updatedAt, now).stale;
    });
}
export function formatPrice(priceWad) {
    const usd = Number(formatUnits(priceWad, 18, 8));
    if (!Number.isFinite(usd))
        return formatUnits(priceWad, 18, 4);
    if (usd >= 100)
        return formatUnits(priceWad, 18, 2);
    if (usd >= 1)
        return formatUnits(priceWad, 18, 4);
    return formatUnits(priceWad, 18, 6);
}
