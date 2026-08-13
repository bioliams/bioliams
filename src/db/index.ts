import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://labkit:labkit@localhost:5432/labkit";

// Supabase's pooler (and PgBouncer generally) runs in transaction mode, where
// prepared statements aren't supported and each invocation should hold at most
// one connection. Detected from the pooler host/port so self-hosted Postgres
// keeps full pooling and prepared statements.
const isPooled =
  /pooler\.supabase\.com|pgbouncer=true|:6543/.test(connectionString) ||
  process.env.DATABASE_POOLED === "true";

declare global {
  var __dbClient: ReturnType<typeof postgres> | undefined;
}

// Reuse the connection across HMR reloads in dev and across warm serverless invocations.
const client =
  globalThis.__dbClient ??
  postgres(connectionString, {
    max: isPooled ? 1 : 10,
    prepare: !isPooled,
    idle_timeout: isPooled ? 20 : undefined,
  });

if (process.env.NODE_ENV !== "production" || process.env.VERCEL) {
  globalThis.__dbClient = client;
}

export const db = drizzle(client, { schema });
export type Db = typeof db;
/** Either the pool or an open transaction, so services can compose. */
export type Tx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];
