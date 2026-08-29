import { PrismaClient } from "@prisma/client";
import { env } from "../env.js";
// The app is one long-running Node process, and Prisma keeps its own pool.
// Application traffic still uses Neon's pooled URL. PgBouncer is in transaction
// mode, so Prisma must not cache named prepared statements on that host.
function prismaDatasourceUrl(url) {
    const parsed = new URL(url);
    if (parsed.hostname.includes("-pooler")) {
        parsed.searchParams.set("pgbouncer", "true");
        parsed.searchParams.set("connect_timeout", "15");
    }
    return parsed.toString();
}
export const prisma = new PrismaClient({
    datasources: { db: { url: prismaDatasourceUrl(env.databaseUrl) } },
});
