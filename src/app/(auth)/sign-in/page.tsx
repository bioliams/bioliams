"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/i18n/client";
import { authError } from "@/i18n/labels";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Set on deployments that run a shared demo lab; self-hosted installs leave it
// unset and the shortcut never renders.
const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL;
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

export default function SignInPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      setError(authError(t, error, t("auth.signInFailed")));
      setPending(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function signInDemo() {
    if (!DEMO_EMAIL || !DEMO_PASSWORD) return;
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (error) {
      setError(authError(t, error, t("auth.signInFailed")));
      setPending(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="size-10 rounded-lg" />
        <span className="text-2xl font-semibold tracking-tight">BioLIMS</span>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("auth.signIn")}</CardTitle>
          <CardDescription>{t("auth.signInDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
            {DEMO_EMAIL && DEMO_PASSWORD && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={pending}
                onClick={signInDemo}
              >
                {t("auth.demo")}
              </Button>
            )}
            <p className="text-center text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link href="/sign-up" className="underline">
                {t("auth.createOne")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
      <LanguageSwitcher />
    </div>
  );
}
