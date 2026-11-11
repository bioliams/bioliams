"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createOrganizationAction } from "./actions";
import { useT } from "@/i18n/client";

export function OnboardingForm() {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createOrganizationAction(name);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("auth.onboardingTitle")}</CardTitle>
        <CardDescription>
          {t("auth.onboardingDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org">{t("auth.labName")}</Label>
            <Input
              id="org"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("auth.labPlaceholder")}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("auth.creating") : t("auth.createLab")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
