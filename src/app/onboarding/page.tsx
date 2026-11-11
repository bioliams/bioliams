import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { member } from "@/db/schema";
import { getSession } from "@/lib/tenant";
import { OnboardingForm } from "./onboarding-form";
import { LanguageSwitcher } from "@/components/language-switcher";

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <OnboardingForm />
      <LanguageSwitcher />
    </div>
  );
}
