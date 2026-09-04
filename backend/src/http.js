import { ZodError } from "zod";
export class HttpError extends Error {
    constructor(status, message, code) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = "HttpError";
    }
}
export function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
export function errorHandler(err, _req, res, _next) {
    if (err instanceof ZodError) {
        res.status(400).json({ error: err.issues[0]?.message ?? "Invalid input", code: "VALIDATION" });
        return;
    }
    if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message, code: err.code });
        return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal error", code: "INTERNAL" });
}
