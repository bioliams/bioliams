import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { member } from "@/db/schema";
import { getSession } from "@/lib/tenant";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const memberships = await db
    .select()
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1);
  if (memberships.length > 0) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <OnboardingForm />
    </div>
  );
}
