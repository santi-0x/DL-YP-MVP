import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin, requireAuth, signToken } from "../middleware/auth.js";
import { HttpError, asyncHandler } from "../http.js";
import { prisma } from "../lib/prisma.js";
import { adminAnalytics, adminUsers, commitBorrow, getMarkets, getPortfolio, history, markNotifications, notifications, overlay, previewBorrow, reconstruct, refreshOracle, replayLiquidations, repay, setUser, simulateMarket, stall, stress, supply, systemHealth, updateMarket, withdraw, } from "../services/protocol.js";
export const api = Router();
const amount = z.string().trim().regex(/^\d+(\.\d{1,8})?$/, "Amount must be a positive decimal");
const borrowSchema = z.object({
    collateralSymbol: z.string().trim().min(1),
    collateralAmount: z.string().trim().regex(/^\d+(\.\d{1,8})?$/).default("0"),
    borrowSymbol: z.string().trim().min(1),
    borrowAmount: z.string().trim().regex(/^\d+(\.\d{1,8})?$/).optional(),
    targetHealthFactor: z.string().trim().regex(/^\d+(\.\d{1,4})?$/).optional(),
});
function userBody(user, token) {
    return { token, user: { id: user.id, email: user.email, role: user.role } };
}
api.get("/health", asyncHandler(async (_req, res) => {
    res.json(await systemHealth());
}));
api.post("/auth/register", asyncHandler(async (req, res) => {
    const body = z.object({
        email: z.string().trim().email().max(160),
        password: z.string().min(8).max(72),
    }).parse(req.body);
    const email = body.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
        throw new HttpError(409, "An account with that email already exists", "EMAIL_TAKEN");
    const user = await prisma.user.create({
        data: { email, passwordHash: await bcrypt.hash(body.password, 10), role: "USER" },
    });
    const session = { id: user.id, email: user.email, role: user.role };
    res.status(201).json(userBody(session, signToken(session)));
}));
api.post("/auth/login", asyncHandler(async (req, res) => {
    const body = z.object({
        email: z.string().trim().email(),
        password: z.string().min(1).max(72),
    }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || user.disabled)
        throw new HttpError(401, "Email or password is wrong", "UNAUTHORIZED");
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok)
        throw new HttpError(401, "Email or password is wrong", "UNAUTHORIZED");
    const session = { id: user.id, email: user.email, role: user.role };
    res.json(userBody(session, signToken(session)));
}));
api.get("/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
});
api.get("/markets", requireAuth, asyncHandler(async (_req, res) => {
    res.json({ markets: await getMarkets() });
}));
api.get("/portfolio", requireAuth, asyncHandler(async (req, res) => {
    res.json(await getPortfolio(req.user.id));
}));
api.get("/portfolio/history", requireAuth, asyncHandler(async (req, res) => {
    res.json({ events: await history(req.user.id) });
}));
api.post("/simulate/borrow", requireAuth, asyncHandler(async (req, res) => {
    const body = borrowSchema.parse(req.body);
    res.json(await previewBorrow(req.user.id, body));
}));
api.post("/positions/borrow", requireAuth, asyncHandler(async (req, res) => {
    const body = borrowSchema.parse(req.body);
    res.status(201).json(await commitBorrow(req.user.id, body));
}));
api.post("/positions/supply", requireAuth, asyncHandler(async (req, res) => {
    const body = z.object({ symbol: z.string().min(1), amount, collateral: z.boolean().optional() }).parse(req.body);
    res.status(201).json(await supply(req.user.id, body.symbol, body.amount, body.collateral));
}));
api.post("/positions/withdraw", requireAuth, asyncHandler(async (req, res) => {
    const body = z.object({ symbol: z.string().min(1), amount }).parse(req.body);
    res.json(await withdraw(req.user.id, body.symbol, body.amount));
}));
api.post("/positions/repay", requireAuth, asyncHandler(async (req, res) => {
    const body = z.object({ symbol: z.string().min(1), amount }).parse(req.body);
    res.json(await repay(req.user.id, body.symbol, body.amount));
}));
api.post("/simulate/stress", requireAuth, asyncHandler(async (req, res) => {
    const body = req.body && Object.keys(req.body).length > 0 ? borrowSchema.parse(req.body) : undefined;
    res.json(await stress(req.user.id, body));
}));
api.get("/notifications", requireAuth, asyncHandler(async (req, res) => {
    const rows = await notifications(req.user.id);
    res.json({ notifications: rows, unread: rows.filter((row) => !row.read).length });
}));
api.post("/notifications/read", requireAuth, asyncHandler(async (req, res) => {
    const body = z.object({ id: z.string().min(1) }).parse(req.body);
    const rows = await markNotifications(req.user.id, body.id === "all" ? "all" : body.id);
    res.json({ notifications: rows, unread: rows.filter((row) => !row.read).length });
}));
api.get("/admin/analytics", requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
    res.json(await adminAnalytics());
}));
api.get("/admin/users", requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
    res.json({ users: await adminUsers() });
}));
api.patch("/admin/users/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const body = z.object({
        disabled: z.boolean().optional(),
        role: z.enum(["USER", "ADMIN"]).optional(),
    }).parse(req.body);
    res.json({ user: await setUser(req.user.id, String(req.params.id), body) });
}));
api.patch("/admin/markets/:symbol", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const body = z.object({
        ltvBps: z.number().int().optional(),
        liquidationThresholdBps: z.number().int().optional(),
        liquidationBonusBps: z.number().int().optional(),
        reserveFactorBps: z.number().int().optional(),
        paused: z.boolean().optional(),
        baseAprBps: z.number().int().optional(),
        slope1AprBps: z.number().int().optional(),
        slope2AprBps: z.number().int().optional(),
        optimalUtilBps: z.number().int().optional(),
    }).parse(req.body);
    res.json({ markets: await updateMarket(String(req.params.symbol), body) });
}));
api.post("/admin/markets/:symbol/simulate", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const body = z.object({
        ltvBps: z.number().int(),
        liquidationThresholdBps: z.number().int(),
        liquidationBonusBps: z.number().int(),
    }).parse(req.body);
    res.json(await simulateMarket(String(req.params.symbol), body));
}));
api.post("/admin/liquidations/replay", requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
    res.json(await replayLiquidations());
}));
api.post("/admin/oracle/refresh", requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
    res.json(await refreshOracle());
}));
api.post("/admin/oracle/stall", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const body = z.object({ minutes: z.number().int().min(1).max(24 * 60) }).parse(req.body);
    res.json(await stall(body.minutes));
}));
api.post("/admin/oracle/overlay", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const body = z.object({
        deltas: z.record(z.string(), z.number().min(-95).max(200)).nullable(),
    }).parse(req.body);
    res.json(await overlay(body.deltas));
}));
api.get("/admin/users/:id/reconstruct", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    res.json(await reconstruct(String(req.params.id)));
}));
