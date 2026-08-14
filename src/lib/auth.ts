import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";

/** Vercel sets VERCEL_URL per deployment; prefer an explicit URL when given. */
export function baseUrl() {
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
      // Sends only when an email provider is configured; otherwise the invite
      // link on the members page is the delivery mechanism.
      async sendInvitationEmail(data) {
        if (!process.env.RESEND_API_KEY) return;
        const link = `${baseUrl()}/accept-invite/${data.id}`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM ?? "BioLIMS <onboarding@resend.dev>",
            to: data.email,
            subject: `${data.inviter.user.name} invited you to ${data.organization.name} on BioLIMS`,
            html: `<p>${data.inviter.user.name} invited you to join the lab <strong>${data.organization.name}</strong> on BioLIMS.</p>
<p><a href="${link}">Accept the invitation</a> — it expires in 48 hours.</p>
<p>BioLIMS is an open-source lab inventory system. If you weren't expecting this, ignore this email.</p>`,
          }),
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
