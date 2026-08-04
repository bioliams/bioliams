"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/tenant";
import { seedOrganization } from "@/lib/services/seed-org";
import type { ActionResult } from "@/lib/action-result";

function slugify(name: string) {
  return (
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "lab"
  );
}

export async function createOrganizationAction(name: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Not signed in" };
  if (!name.trim()) return { error: "Name is required" };

  const base = slugify(name);
  // Slugs are globally unique; retry with a suffix on collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    try {
      const org = await auth.api.createOrganization({
        headers: await headers(),
        body: { name: name.trim(), slug, userId: session.user.id },
      });
      if (!org) return { error: "Could not create organization" };
      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: { organizationId: org.id },
      });
      await seedOrganization(org.id);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/slug/i.test(message)) return { error: message };
    }
  }
  return { error: "Could not find an available lab slug — try a different name" };
}
