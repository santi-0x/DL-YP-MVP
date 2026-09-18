import { describe, expect, it } from "vitest";
import { ORACLE_STALE_MS, RAY, balanceOf, formatUnits, oracleStatus, parseUnits, toScaled, } from "./money.js";
import { accrueIndex, borrowAprWad, projectLinear, supplyAprWad, utilizationWad } from "./rates.js";
import { reconstructScaled } from "./replay.js";
import { borrowAmountForTarget, borrowPower, healthFactorWad, liquidationPriceWad, planLiquidation, runScenario, settleLiquidation, } from "./risk.js";
import { ALL_SCENARIOS, PRIMARY_SCENARIOS } from "./scenarios.js";
const u = parseUnits;
function eth(amount, price, ltv = 7500, lt = 8000, bonus = 500) {
    return {
        symbol: "ETH",
        amountWad: u(amount),
        priceWad: u(price),
        ltvBps: ltv,
        liquidationThresholdBps: lt,
        liquidationBonusBps: bonus,
    };
}
function usdc(amount) {
    return { symbol: "USDC", amountWad: u(amount), priceWad: u("1") };
}
describe("fixed-point money", () => {
    it("parses and formats decimal amounts", () => {
        expect(parseUnits("1.5")).toBe(1500000000000000000n);
        expect(formatUnits(parseUnits("10.25"), 18, 4)).toBe("10.25");
        expect(formatUnits(parseUnits("2"), 18, 4)).toBe("2");
    });
    it("round-trips a balance through the liquidity index", () => {
        const index = RAY;
        const amount = u("4.25");
        expect(balanceOf(toScaled(amount, index), index)).toBe(amount);
    });
});
describe("interest model", () => {
    const model = {
        baseAprWad: 0n,
        slope1AprWad: u("0.04"),
        slope2AprWad: u("0.6"),
        optimalUtilWad: u("0.8"),
    };
    it("is linear below the kink and steeper above it", () => {
        expect(borrowAprWad(u("0.4"), model)).toBe(u("0.02"));
        expect(borrowAprWad(u("0.9"), model)).toBe(u("0.34"));
    });
    it("pays suppliers borrow interest times utilization after the reserve", () => {
        const borrow = u("0.02");
        expect(supplyAprWad(borrow, u("0.4"), 1000)).toBe(u("0.0072"));
        expect(utilizationWad(u("40"), u("100"))).toBe(u("0.4"));
    });
    it("accrues about one year of APR onto the index", () => {
        const next = accrueIndex(RAY, u("0.1"), 31536000n);
        const expected = (RAY * 11n) / 10n;
        const diff = next > expected ? next - expected : expected - next;
        expect(diff < 1000000000n).toBe(true);
    });
    it("projects linear debt growth", () => {
        expect(projectLinear(u("1000"), u("0.1"), 31536000n)).toBe(u("1100"));
    });
});
describe("health, liquidation, bad debt", () => {
    it("computes health factor and liquidation price", () => {
        const collat = [eth("10", "3000")];
        const debt = [usdc("12000")];
        expect(healthFactorWad(collat, debt)).toBe(u("2"));
        expect(liquidationPriceWad("ETH", collat, debt)).toBe(u("1500"));
        expect(borrowPower(collat)).toBe(u("22500"));
        expect(healthFactorWad(collat, [])).toBeNull();
    });
    it("seizes collateral with the bonus on a partial liquidation", () => {
        const plan = planLiquidation([eth("10", "1400")], [usdc("12000")], 5000);
        expect(plan.skipped).toBe(false);
        expect(plan.repay).toEqual([{ symbol: "USDC", amountWad: u("6000") }]);
        expect(plan.seize).toEqual([{ symbol: "ETH", amountWad: u("4.5") }]);
        expect(plan.badDebt).toEqual([]);
    });
    it("writes off bad debt when collateral cannot cover the loan", () => {
        const settled = settleLiquidation([eth("0.1", "3000", 7500, 8000, 0)], [usdc("10000")], 5000);
        expect(settled.repay).toEqual([{ symbol: "USDC", amountWad: u("300") }]);
        expect(settled.seize).toEqual([{ symbol: "ETH", amountWad: u("0.1") }]);
        expect(settled.badDebt).toEqual([{ symbol: "USDC", amountWad: u("9700") }]);
        expect(settled.remainingDebt).toEqual([]);
    });
    it("solves a borrow that lands on a target health factor", () => {
        const collat = [eth("10", "3000", 7500, 8250)];
        const amount = borrowAmountForTarget(collat, [], u("1"), u("2"));
        expect(amount).toBe(u("12375"));
        const hf = healthFactorWad(collat, [usdc(formatUnits(amount, 18, 0))]);
        expect(hf).toBe(u("2"));
    });
});
describe("oracle staleness and shocks", () => {
    it("marks prices stale at one hour", () => {
        const now = 1_700_000_000_000;
        expect(oracleStatus(now - ORACLE_STALE_MS + 1, now).stale).toBe(false);
        expect(oracleStatus(now - ORACLE_STALE_MS, now).stale).toBe(true);
        expect(ORACLE_STALE_MS).toBe(60 * 60 * 1000);
    });
    it("replays a 10% drawdown against health", () => {
        const result = runScenario([eth("10", "3000")], [usdc("12000")], { USDC: u("0.05") }, PRIMARY_SCENARIOS[0]);
        expect(result.healthFactorWad).toBe(u("1.8"));
        expect(result.liquidatable).toBe(false);
    });
    it("ships the required stress set and more than 20 historical shocks", () => {
        const ids = PRIMARY_SCENARIOS.map((scenario) => scenario.id);
        expect(ids).toEqual(["drawdown-10", "drawdown-20", "drawdown-30", "correlated"]);
        expect(PRIMARY_SCENARIOS.find((scenario) => scenario.id === "correlated")?.rateMultiplierBps).toBe(15000);
        const historical = ALL_SCENARIOS.filter((scenario) => scenario.group === "historical");
        expect(historical.length).toBeGreaterThanOrEqual(22);
        const depeg = historical.find((scenario) => scenario.id === "wbtc-depeg");
        expect(depeg?.deltas.WBTC).toBeLessThan(depeg?.deltas.BTC ?? 0);
    });
});
describe("ledger reconstruction", () => {
    it("rebuilds scaled balances, then the index restores accrued value", () => {
        const deposited = toScaled(u("5"), RAY);
        const borrowed = toScaled(u("1000"), RAY);
        const books = reconstructScaled([
            { symbol: "ETH", scaledWad: deposited, side: "supply" },
            { symbol: "USDC", scaledWad: borrowed, side: "borrow" },
            { symbol: "USDC", scaledWad: -toScaled(u("200"), RAY), side: "borrow" },
        ]);
        expect(books.supply.get("ETH")).toBe(deposited);
        expect(books.borrow.get("USDC")).toBe(toScaled(u("800"), RAY));
        const grown = accrueIndex(RAY, u("0.1"), 31536000n);
        const actual = balanceOf(books.borrow.get("USDC") ?? 0n, grown);
        const expected = (u("800") * grown) / RAY;
        const diff = actual > expected ? actual - expected : expected - actual;
        expect(diff < 1000n).toBe(true);
    });
});
