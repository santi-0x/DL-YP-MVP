import { WAD, bpsOf, minBig, wadDiv, wadMul } from "./money.js";
import { projectLinear } from "./rates.js";
export function usdValue(amountWad, priceWad) {
    return wadMul(amountWad, priceWad);
}
export function collateralValue(legs) {
    return legs.reduce((sum, leg) => sum + usdValue(leg.amountWad, leg.priceWad), 0n);
}
export function debtValue(legs) {
    return legs.reduce((sum, leg) => sum + usdValue(leg.amountWad, leg.priceWad), 0n);
}
export function weightedCollateral(legs) {
    return legs.reduce((sum, leg) => sum + bpsOf(usdValue(leg.amountWad, leg.priceWad), leg.liquidationThresholdBps), 0n);
}
export function borrowPower(legs) {
    return legs.reduce((sum, leg) => sum + bpsOf(usdValue(leg.amountWad, leg.priceWad), leg.ltvBps), 0n);
}
/** Health factor in wad. Null when there is no debt. */
export function healthFactorWad(collat, debt) {
    const owed = debtValue(debt);
    if (owed === 0n)
        return null;
    return wadDiv(weightedCollateral(collat), owed);
}
export function shockPrice(priceWad, deltaPercent) {
    if (!deltaPercent)
        return priceWad;
    const bps = BigInt(Math.round(deltaPercent * 100));
    const next = priceWad + (priceWad * bps) / 10000n;
    return next > 0n ? next : 0n;
}
/**
 * Price of `symbol` at which health factor is 1, other prices held constant.
 * 0n means other collateral already covers the debt.
 */
export function liquidationPriceWad(symbol, collat, debt) {
    const leg = collat.find((item) => item.symbol === symbol);
    if (!leg || leg.amountWad <= 0n || leg.liquidationThresholdBps <= 0)
        return null;
    const others = weightedCollateral(collat.filter((item) => item.symbol !== symbol));
    const need = debtValue(debt) - others;
    if (need <= 0n)
        return 0n;
    return (need * WAD * 10000n) / (leg.amountWad * BigInt(leg.liquidationThresholdBps));
}
/** Fraction of the current price that can be lost before liquidation. Null if none. */
export function dropToLiquidationWad(currentPrice, liquidationPrice) {
    if (liquidationPrice === null || currentPrice <= 0n)
        return null;
    if (liquidationPrice <= 0n)
        return null;
    if (liquidationPrice >= currentPrice)
        return 0n;
    return wadDiv(currentPrice - liquidationPrice, currentPrice);
}
function rowsOf(map) {
    return [...map.entries()]
        .filter(([, amount]) => amount > 0n)
        .map(([symbol, amountWad]) => ({ symbol, amountWad }));
}
/**
 * One close-factor pass. If collateral runs out, leftover debt is bad debt.
 * Highest liquidation bonus is seized first. Largest debt is repaid first.
 */
export function planLiquidation(collat, debt, closeFactorBps = 5000) {
    const hf = healthFactorWad(collat, debt);
    if (hf === null || hf >= WAD) {
        return { skipped: true, healthFactorWad: hf, repay: [], seize: [], badDebt: [] };
    }
    const collats = collat
        .filter((leg) => leg.amountWad > 0n && leg.priceWad > 0n)
        .map((leg) => ({ ...leg }))
        .sort((a, b) => {
        if (b.liquidationBonusBps !== a.liquidationBonusBps)
            return b.liquidationBonusBps - a.liquidationBonusBps;
        const diff = usdValue(b.amountWad, b.priceWad) - usdValue(a.amountWad, a.priceWad);
        return diff > 0n ? 1 : diff < 0n ? -1 : 0;
    });
    const debts = debt
        .filter((leg) => leg.amountWad > 0n && leg.priceWad > 0n)
        .map((leg) => ({ ...leg }))
        .sort((a, b) => {
        const diff = usdValue(b.amountWad, b.priceWad) - usdValue(a.amountWad, a.priceWad);
        return diff > 0n ? 1 : diff < 0n ? -1 : 0;
    });
    const totalDebt = debts.reduce((sum, leg) => sum + usdValue(leg.amountWad, leg.priceWad), 0n);
    let target = bpsOf(totalDebt, closeFactorBps);
    if (target <= 0n)
        target = totalDebt;
    const repay = new Map();
    const seize = new Map();
    let ci = 0;
    let di = 0;
    let guard = 0;
    while (target > 0n && ci < collats.length && di < debts.length && guard++ < 40) {
        const c = collats[ci];
        const d = debts[di];
        const debtVal = usdValue(d.amountWad, d.priceWad);
        const collatVal = usdValue(c.amountWad, c.priceWad);
        const bonusDen = 10000n + BigInt(c.liquidationBonusBps);
        const coverable = (collatVal * 10000n) / bonusDen;
        let repayVal = minBig(coverable, debtVal);
        if (repayVal > target)
            repayVal = target;
        if (repayVal <= 0n) {
            if (coverable <= 0n || c.amountWad === 0n)
                ci += 1;
            else
                di += 1;
            continue;
        }
        let repayAmt = (repayVal * WAD) / d.priceWad;
        if (repayAmt > d.amountWad)
            repayAmt = d.amountWad;
        if (repayAmt === 0n)
            break;
        const seizeVal = (repayVal * bonusDen) / 10000n;
        let seizeAmt = (seizeVal * WAD) / c.priceWad;
        if (seizeAmt > c.amountWad || seizeAmt === 0n)
            seizeAmt = c.amountWad;
        repay.set(d.symbol, (repay.get(d.symbol) ?? 0n) + repayAmt);
        seize.set(c.symbol, (seize.get(c.symbol) ?? 0n) + seizeAmt);
        d.amountWad -= repayAmt;
        c.amountWad -= seizeAmt;
        target -= repayVal;
        if (c.amountWad === 0n)
            ci += 1;
        if (d.amountWad === 0n)
            di += 1;
    }
    const collateralLeft = collats.reduce((sum, leg) => sum + leg.amountWad, 0n);
    const badDebt = [];
    if (collateralLeft === 0n) {
        for (const leg of debts) {
            if (leg.amountWad > 0n)
                badDebt.push({ symbol: leg.symbol, amountWad: leg.amountWad });
        }
    }
    return {
        skipped: false,
        healthFactorWad: hf,
        repay: rowsOf(repay),
        seize: rowsOf(seize),
        badDebt,
    };
}
export function settleLiquidation(collat, debt, closeFactorBps = 5000, rounds = 8) {
    const c = collat.map((leg) => ({ ...leg }));
    const d = debt.map((leg) => ({ ...leg }));
    const repay = new Map();
    const seize = new Map();
    const bad = new Map();
    const add = (map, symbol, amount) => {
        map.set(symbol, (map.get(symbol) ?? 0n) + amount);
    };
    let steps = 0;
    for (let i = 0; i < rounds; i += 1) {
        const plan = planLiquidation(c, d, closeFactorBps);
        if (plan.skipped)
            break;
        steps += 1;
        for (const move of plan.repay) {
            add(repay, move.symbol, move.amountWad);
            const leg = d.find((item) => item.symbol === move.symbol);
            if (leg)
                leg.amountWad = leg.amountWad > move.amountWad ? leg.amountWad - move.amountWad : 0n;
        }
        for (const move of plan.seize) {
            add(seize, move.symbol, move.amountWad);
            const leg = c.find((item) => item.symbol === move.symbol);
            if (leg)
                leg.amountWad = leg.amountWad > move.amountWad ? leg.amountWad - move.amountWad : 0n;
        }
        for (const move of plan.badDebt) {
            add(bad, move.symbol, move.amountWad);
            const leg = d.find((item) => item.symbol === move.symbol);
            if (leg)
                leg.amountWad = 0n;
        }
        if (plan.repay.length === 0 && plan.seize.length === 0 && plan.badDebt.length === 0)
            break;
    }
    return {
        steps,
        repay: rowsOf(repay),
        seize: rowsOf(seize),
        badDebt: rowsOf(bad),
        remainingCollateral: c.filter((leg) => leg.amountWad > 0n),
        remainingDebt: d.filter((leg) => leg.amountWad > 0n),
    };
}
const DAY = 86400n;
export function runScenario(collat, debt, aprBySymbol, scenario) {
    const shockedCollat = collat.map((leg) => ({
        ...leg,
        priceWad: shockPrice(leg.priceWad, scenario.deltas[leg.symbol] ?? 0),
    }));
    const shockedDebt = debt.map((leg) => ({
        ...leg,
        priceWad: shockPrice(leg.priceWad, scenario.deltas[leg.symbol] ?? 0),
    }));
    const hf = healthFactorWad(shockedCollat, shockedDebt);
    const liquidatable = hf !== null && hf < WAD;
    const settled = liquidatable ? settleLiquidation(shockedCollat, shockedDebt) : null;
    const debtPx = new Map(shockedDebt.map((leg) => [leg.symbol, leg.priceWad]));
    const badDebtUsd = (settled?.badDebt ?? []).reduce((sum, move) => sum + usdValue(move.amountWad, debtPx.get(move.symbol) ?? 0n), 0n);
    const multiplier = (WAD * BigInt(scenario.rateMultiplierBps)) / 10000n;
    let interest30dUsd = 0n;
    for (const leg of shockedDebt) {
        const apr = wadMul(aprBySymbol[leg.symbol] ?? 0n, multiplier);
        const grown = projectLinear(leg.amountWad, apr, 30n * DAY);
        interest30dUsd += usdValue(grown - leg.amountWad, leg.priceWad);
    }
    const primary = [...shockedCollat].sort((a, b) => {
        const diff = usdValue(b.amountWad, b.priceWad) - usdValue(a.amountWad, a.priceWad);
        return diff > 0n ? 1 : diff < 0n ? -1 : 0;
    })[0];
    const liqPx = primary ? liquidationPriceWad(primary.symbol, shockedCollat, shockedDebt) : null;
    const symbols = new Set([
        ...collat.map((leg) => leg.symbol),
        ...debt.map((leg) => leg.symbol),
        ...Object.keys(scenario.deltas),
    ]);
    const priceOf = (symbol) => shockedCollat.find((leg) => leg.symbol === symbol)?.priceWad ??
        shockedDebt.find((leg) => leg.symbol === symbol)?.priceWad;
    const shocked = [...symbols]
        .filter((symbol) => priceOf(symbol) !== undefined)
        .map((symbol) => ({
        symbol,
        priceWad: priceOf(symbol),
        deltaPct: scenario.deltas[symbol] ?? 0,
    }));
    return {
        healthFactorWad: hf,
        liquidatable,
        collateralUsd: collateralValue(shockedCollat),
        debtUsd: debtValue(shockedDebt),
        badDebtUsd,
        interest30dUsd,
        liquidationSymbol: primary?.symbol ?? null,
        liquidationPriceWad: liqPx,
        dropToLiquidationWad: primary ? dropToLiquidationWad(primary.priceWad, liqPx) : null,
        shocked,
    };
}
export function borrowAmountForTarget(collat, debt, borrowPriceWad, targetHfWad) {
    if (borrowPriceWad <= 0n)
        throw new Error("borrow price missing");
    if (targetHfWad <= WAD)
        throw new Error("target health factor must be above 1");
    const needed = wadDiv(weightedCollateral(collat), targetHfWad);
    const existing = debtValue(debt);
    if (needed <= existing)
        return 0n;
    return wadDiv(needed - existing, borrowPriceWad);
}
export function assertRiskBounds(input) {
    if (input.ltvBps < 0 || input.ltvBps > 9000)
        throw new Error("LTV must be between 0% and 90%");
    if (input.liquidationThresholdBps < 1 || input.liquidationThresholdBps > 9500) {
        throw new Error("Liquidation threshold must be between 0.01% and 95%");
    }
    if (input.ltvBps >= input.liquidationThresholdBps) {
        throw new Error("LTV must stay below the liquidation threshold");
    }
    if (input.liquidationBonusBps < 0 || input.liquidationBonusBps > 2000) {
        throw new Error("Liquidation bonus must be between 0% and 20%");
    }
    if (input.reserveFactorBps < 0 || input.reserveFactorBps > 5000) {
        throw new Error("Reserve factor must be between 0% and 50%");
    }
}
