import bcrypt from "bcryptjs";
import { RAY, parseUnits, toScaled } from "../src/engine/money.js";
import { env } from "../src/env.js";
import { prisma } from "../src/lib/prisma.js";
void env;
const INDEX = RAY.toString();
const markets = [
    {
        symbol: "ETH",
        name: "Ether",
        coingeckoId: "ethereum",
        coinbasePair: "ETH-USD",
        seedPriceUsd: "3500",
        isCollateral: true,
        ltvBps: 7500,
        liquidationThresholdBps: 8250,
        liquidationBonusBps: 500,
        reserveFactorBps: 1000,
        closeFactorBps: 5000,
        baseApr: "0",
        slope1: "0.028",
        slope2: "0.80",
        optimal: "0.80",
        treasury: "800",
        seededBorrow: "280",
    },
    {
        symbol: "BTC",
        name: "Bitcoin",
        coingeckoId: "bitcoin",
        coinbasePair: "BTC-USD",
        seedPriceUsd: "98000",
        isCollateral: true,
        ltvBps: 7200,
        liquidationThresholdBps: 8000,
        liquidationBonusBps: 550,
        reserveFactorBps: 1000,
        closeFactorBps: 5000,
        baseApr: "0",
        slope1: "0.025",
        slope2: "0.80",
        optimal: "0.75",
        treasury: "40",
        seededBorrow: "15",
    },
    {
        symbol: "WBTC",
        name: "Wrapped Bitcoin",
        coingeckoId: "wrapped-bitcoin",
        coinbasePair: "WBTC-USD",
        seedPriceUsd: "97920",
        isCollateral: true,
        ltvBps: 6800,
        liquidationThresholdBps: 7800,
        liquidationBonusBps: 700,
        reserveFactorBps: 1500,
        closeFactorBps: 5000,
        baseApr: "0",
        slope1: "0.032",
        slope2: "1.00",
        optimal: "0.70",
        treasury: "30",
        seededBorrow: "12",
    },
    {
        symbol: "LINK",
        name: "Chainlink",
        coingeckoId: "chainlink",
        coinbasePair: "LINK-USD",
        seedPriceUsd: "18.40",
        isCollateral: true,
        ltvBps: 5500,
        liquidationThresholdBps: 7000,
        liquidationBonusBps: 850,
        reserveFactorBps: 2000,
        closeFactorBps: 5000,
        baseApr: "0",
        slope1: "0.05",
        slope2: "1.20",
        optimal: "0.60",
        treasury: "80000",
        seededBorrow: "32000",
    },
    {
        symbol: "USDC",
        name: "USD Coin",
        coingeckoId: "usd-coin",
        coinbasePair: "USDC-USD",
        seedPriceUsd: "1",
        isCollateral: true,
        ltvBps: 8000,
        liquidationThresholdBps: 8700,
        liquidationBonusBps: 400,
        reserveFactorBps: 1000,
        closeFactorBps: 5000,
        baseApr: "0",
        slope1: "0.04",
        slope2: "0.60",
        optimal: "0.90",
        treasury: "5000000",
        seededBorrow: "2750000",
    },
];
function scaled(amount) {
    return toScaled(parseUnits(amount), RAY).toString();
}
async function main() {
    await prisma.notification.deleteMany();
    await prisma.ledgerEvent.deleteMany();
    await prisma.priceSnapshot.deleteMany();
    await prisma.borrow.deleteMany();
    await prisma.supply.deleteMany();
    await prisma.market.deleteMany();
    await prisma.user.deleteMany();
    const now = new Date();
    for (const market of markets) {
        await prisma.market.create({
            data: {
                id: market.symbol,
                symbol: market.symbol,
                name: market.name,
                coingeckoId: market.coingeckoId,
                coinbasePair: market.coinbasePair,
                seedPriceUsd: market.seedPriceUsd,
                isCollateral: market.isCollateral,
                ltvBps: market.ltvBps,
                liquidationThresholdBps: market.liquidationThresholdBps,
                liquidationBonusBps: market.liquidationBonusBps,
                reserveFactorBps: market.reserveFactorBps,
                closeFactorBps: market.closeFactorBps,
                baseAprWad: parseUnits(market.baseApr).toString(),
                slope1AprWad: parseUnits(market.slope1).toString(),
                slope2AprWad: parseUnits(market.slope2).toString(),
                optimalUtilWad: parseUnits(market.optimal).toString(),
                treasuryScaledWad: scaled(market.treasury),
                seededBorrowScaledWad: scaled(market.seededBorrow),
                liquidityIndexRay: INDEX,
                borrowIndexRay: INDEX,
                lastAccrual: now,
            },
        });
    }
    const user = await prisma.user.create({
        data: {
            email: "demo@lending.dev",
            passwordHash: await bcrypt.hash("demopass123", 10),
            role: "ADMIN",
        },
    });
    const ethScaled = scaled("4");
    const usdcScaled = scaled("2000");
    await prisma.supply.create({
        data: { userId: user.id, marketId: "ETH", scaledWad: ethScaled, collateral: true },
    });
    await prisma.borrow.create({
        data: { userId: user.id, marketId: "USDC", scaledWad: usdcScaled },
    });
    await prisma.ledgerEvent.create({
        data: {
            userId: user.id,
            marketId: "ETH",
            kind: "DEPOSIT",
            symbol: "ETH",
            amountWad: parseUnits("4").toString(),
            meta: { side: "supply", scaledWad: ethScaled, indexRay: INDEX, action: "deposit" },
        },
    });
    await prisma.ledgerEvent.create({
        data: {
            userId: user.id,
            marketId: "USDC",
            kind: "BORROW",
            symbol: "USDC",
            amountWad: parseUnits("2000").toString(),
            meta: { side: "borrow", scaledWad: usdcScaled, indexRay: INDEX, action: "borrow" },
        },
    });
    console.log("seeded markets: ETH, BTC, WBTC, LINK, USDC");
    console.log("demo login: demo@lending.dev / demopass123 (admin)");
}
main()
    .then(() => prisma.$disconnect())
    .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
});
