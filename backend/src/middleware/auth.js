import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { HttpError, asyncHandler } from "../http.js";
import { prisma } from "../lib/prisma.js";
export function signToken(user) {
    return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.jwtSecret, { expiresIn: "12h" });
}
export const requireAuth = asyncHandler(async (req, _res, next) => {
    const header = req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token)
        throw new HttpError(401, "Login required", "UNAUTHORIZED");
    let payload;
    try {
        payload = jwt.verify(token, env.jwtSecret);
    }
    catch {
        throw new HttpError(401, "Session expired", "UNAUTHORIZED");
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.disabled)
        throw new HttpError(401, "Login required", "UNAUTHORIZED");
    req.user = { id: user.id, email: user.email, role: user.role };
    next();
});
export function requireAdmin(req, _res, next) {
    if (req.user?.role !== "ADMIN") {
        next(new HttpError(403, "Admin only", "FORBIDDEN"));
        return;
    }
    next();
}
