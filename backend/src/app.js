import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { errorHandler } from "./http.js";
import { api } from "./routes/api.js";
export const app = express();
app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
}));
app.use("/api/auth", rateLimit({
    windowMs: 15 * 60_000,
    limit: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many auth attempts", code: "RATE_LIMIT" },
}));
app.use("/api", api);
app.use((_req, res) => {
    res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
});
app.use(errorHandler);
