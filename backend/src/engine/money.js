export const WAD = 10n ** 18n;
export const RAY = 10n ** 27n;
export const SECONDS_PER_YEAR = 31536000n;
export const ORACLE_STALE_MS = 60 * 60 * 1000;
export function parseUnits(amount, scale = 18) {
    const s = amount.trim();
    if (!/^-?\d+(\.\d+)?$/.test(s)) {
        throw new Error(`Invalid amount: ${amount}`);
    }
    const neg = s.startsWith("-");
    const raw = neg ? s.slice(1) : s;
    const [whole, frac = ""] = raw.split(".");
    if (frac.length > scale) {
        throw new Error(`Too many decimal places: ${amount}`);
    }
    const padded = (frac || "0").padEnd(scale, "0");
    const value = BigInt(whole || "0") * 10n ** BigInt(scale) + BigInt(padded);
    return neg ? -value : value;
}
export function formatUnits(value, scale = 18, maxFrac = 8) {
    const neg = value < 0n;
    const v = neg ? -value : value;
    const base = 10n ** BigInt(scale);
    const whole = v / base;
    let frac = (v % base).toString().padStart(scale, "0").slice(0, maxFrac);
    frac = frac.replace(/0+$/, "");
    const out = frac.length ? `${whole.toString()}.${frac}` : whole.toString();
    return neg ? `-${out}` : out;
}
export function wadMul(a, b) {
    return (a * b + WAD / 2n) / WAD;
}
export function wadDiv(a, b) {
    if (b === 0n)
        throw new Error("division by zero");
    return (a * WAD + b / 2n) / b;
}
export function minBig(a, b) {
    return a < b ? a : b;
}
export function maxBig(a, b) {
    return a > b ? a : b;
}
export function absBig(a) {
    return a < 0n ? -a : a;
}
/** Actual token amount (wad) from a scaled balance and a ray index. */
export function balanceOf(scaledWad, indexRay) {
    return (scaledWad * indexRay + RAY / 2n) / RAY;
}
/** Scaled balance from an actual token amount and a ray index. */
export function toScaled(amountWad, indexRay) {
    if (indexRay <= 0n)
        throw new Error("index must be positive");
    return (amountWad * RAY + indexRay / 2n) / indexRay;
}
export function oracleStatus(updatedAtMs, nowMs, staleAfterMs = ORACLE_STALE_MS) {
    const ageMs = Math.max(0, nowMs - updatedAtMs);
    return {
        ageMs,
        stale: ageMs >= staleAfterMs,
        staleAfterMs,
    };
}
export function bpsOf(value, bps) {
    return (value * BigInt(bps)) / 10000n;
}
