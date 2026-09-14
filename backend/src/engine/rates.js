import { RAY, SECONDS_PER_YEAR, WAD, wadDiv, wadMul } from "./money.js";
export function utilizationWad(totalBorrow, totalSupply) {
    if (totalSupply <= 0n)
        return totalBorrow > 0n ? WAD : 0n;
    const u = wadDiv(totalBorrow, totalSupply);
    return u > WAD ? WAD : u;
}
/** Kinked utilization curve. APR is a wad fraction (0.04e18 = 4%). */
export function borrowAprWad(utilWad, model) {
    let util = utilWad;
    if (util < 0n)
        util = 0n;
    if (util > WAD)
        util = WAD;
    const { baseAprWad, slope1AprWad, slope2AprWad, optimalUtilWad } = model;
    if (optimalUtilWad <= 0n || optimalUtilWad >= WAD) {
        throw new Error("optimal utilization must sit between 0 and 1");
    }
    if (util <= optimalUtilWad) {
        return baseAprWad + wadMul(slope1AprWad, wadDiv(util, optimalUtilWad));
    }
    const excess = wadDiv(util - optimalUtilWad, WAD - optimalUtilWad);
    return baseAprWad + slope1AprWad + wadMul(slope2AprWad, excess);
}
export function supplyAprWad(borrowApr, utilWad, reserveFactorBps) {
    let util = utilWad;
    if (util < 0n)
        util = 0n;
    if (util > WAD)
        util = WAD;
    const keepBps = 10000n - BigInt(reserveFactorBps);
    if (keepBps < 0n)
        throw new Error("reserve factor exceeds 100%");
    return (wadMul(borrowApr, util) * keepBps) / 10000n;
}
/** Linear per-second index accrual. Index is ray, APR is wad. */
export function accrueIndex(indexRay, aprWad, dtSeconds) {
    if (dtSeconds <= 0n || aprWad <= 0n || indexRay <= 0n)
        return indexRay;
    const aprRay = aprWad * (RAY / WAD);
    const ratePerSecondRay = aprRay / SECONDS_PER_YEAR;
    const factor = RAY + ratePerSecondRay * dtSeconds;
    return (indexRay * factor + RAY / 2n) / RAY;
}
/** Linear growth of a token balance at a constant APR. */
export function projectLinear(amountWad, aprWad, seconds) {
    if (seconds <= 0n || aprWad <= 0n || amountWad === 0n)
        return amountWad;
    const growth = (aprWad * seconds) / SECONDS_PER_YEAR;
    return amountWad + wadMul(amountWad, growth);
}
