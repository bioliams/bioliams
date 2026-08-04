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
  // Every Vercel deployment gets its own hostname, and the project alias differs
  // again from those, so trust the whole vercel.app space when running there.
  trustedOrigins: [
    baseUrl(),
    ...(process.env.VERCEL
      ? [
          "https://*.vercel.app",
          ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
          ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
            : []),
        ]
      : []),
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
