import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";

/** Vercel sets VERCEL_URL per deployment; prefer an explicit URL when given. */
function baseUrl() {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  baseURL: baseUrl(),
  secret: process.env.BETTER_AUTH_SECRET,
  // Preview deployments get a fresh hostname on every push, so trust them too.
  trustedOrigins: [
    baseUrl(),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      organizationLimit: 20,
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
