import dotenv from "dotenv";
import { existsSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { resolve } from "path";
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(backendRoot, "..");
dotenv.config({ path: resolve(backendRoot, ".env") });
// `neon deploy` / `neon env pull` write the branch URLs to .env when that file
// already exists, and to .env.local otherwise. Those values replace a local URL.
const neonEnvFile = existsSync(resolve(repoRoot, ".env"))
    ? resolve(repoRoot, ".env")
    : resolve(repoRoot, ".env.local");
if (existsSync(neonEnvFile)) {
    dotenv.config({ path: neonEnvFile, override: true });
}
if (!process.env.DATABASE_URL_UNPOOLED && process.env.DATABASE_URL) {
    process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;
}
function required(name) {
    const value = process.env[name];
    if (!value)
        throw new Error(`Missing ${name}. Set it in backend/.env`);
    return value;
}
export const env = {
    databaseUrl: required("DATABASE_URL"),
    databaseUrlUnpooled: required("DATABASE_URL_UNPOOLED"),
    neonBranch: process.env.NEON_BRANCH ?? "",
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    jwtSecret: process.env.JWT_SECRET ?? "dev-only-not-for-production",
    port: Number(process.env.PORT ?? 4000),
};
