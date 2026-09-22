// Loads backend/.env, then the Neon env file, then runs a command.
// Prisma CLI reads DATABASE_URL / DATABASE_URL_UNPOOLED itself and does not
// go through src/env.ts. Migrations use the direct URL.
const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");
const dotenv = require("dotenv");

const backendRoot = resolve(__dirname, "..");
const repoRoot = resolve(backendRoot, "..");

dotenv.config({ path: resolve(backendRoot, ".env") });
const neonEnvFile = existsSync(resolve(repoRoot, ".env"))
  ? resolve(repoRoot, ".env")
  : resolve(repoRoot, ".env.local");
if (existsSync(neonEnvFile)) dotenv.config({ path: neonEnvFile, override: true });
if (!process.env.DATABASE_URL_UNPOOLED && process.env.DATABASE_URL) {
  process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("usage: node scripts/with-neon-env.cjs <command> [args]");
  process.exit(1);
}

const child = spawnSync(command, args, {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});
process.exit(child.status ?? 1);
