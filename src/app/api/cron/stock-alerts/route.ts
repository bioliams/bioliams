import { NextResponse } from "next/server";
import { syncAllOrgs } from "@/lib/services/notifications";

/**
 * Daily sweep for expiry alarms. Stock alarms are raised as soon as anyone
 * opens the app, but an item can expire over a weekend with nobody looking —
 * this makes sure the email still goes out.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; anything else
 * (a self-hosted crontab, say) must send the same.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncAllOrgs();
  return NextResponse.json(result);
}
