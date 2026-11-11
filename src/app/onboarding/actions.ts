"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/tenant";
import { seedOrganization } from "@/lib/services/seed-org";
import type { ActionResult } from "@/lib/action-result";
import { getT } from "@/i18n/server";
import { translateServerMessage } from "@/i18n/server-errors";

/**
 * A URL-safe slug. Names with no Latin letters (Persian, say) would all come
 * out as plain "lab" and exhaust the retries after a handful of labs, so they
 * get a random tail instead.
 */
function slugify(name: string) {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return ascii || `lab-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createOrganizationAction(name: string): Promise<ActionResult> {
  const session = await getSession();
  const t = await getT();
  if (!session) return { error: t("errors.notSignedIn") };
  if (!name.trim()) return { error: t("errors.nameRequired") };

  const base = slugify(name);
  // Slugs are globally unique; retry with a suffix on collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    try {
      const org = await auth.api.createOrganization({
        headers: await headers(),
        body: { name: name.trim(), slug, userId: session.user.id },
      });
      if (!org) return { error: t("errors.couldNotCreateOrg") };
      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: { organizationId: org.id },
      });
      await seedOrganization(org.id);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/slug/i.test(message)) return { error: translateServerMessage(message, t) };
    }
  }
  return { error: t("errors.noSlug") };
}
