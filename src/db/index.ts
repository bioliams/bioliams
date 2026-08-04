import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://labkit:labkit@localhost:5432/labkit";

declare global {
  var __dbClient: ReturnType<typeof postgres> | undefined;
}

// Reuse the connection across HMR reloads in dev.
const client = globalThis.__dbClient ?? postgres(connectionString, { max: 10 });
if (process.env.NODE_ENV !== "production") globalThis.__dbClient = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
