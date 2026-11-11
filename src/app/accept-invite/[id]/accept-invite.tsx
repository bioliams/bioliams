"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/i18n/client";
import { authError } from "@/i18n/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AcceptInvite({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const t = useT();
  const [pending, setPending] = useState(false);

  async function accept() {
    setPending(true);
    const { error } = await authClient.organization.acceptInvitation({ invitationId });
    setPending(false);
    if (error) {
      toast.error(authError(t, error, t("auth.acceptFailed")));
      return;
    }
    toast.success(t("auth.joined"));
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("auth.joinTitle")}</CardTitle>
        <CardDescription>{t("auth.joinDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={accept} disabled={pending} className="w-full">
          {pending ? t("auth.joining") : t("auth.accept")}
        </Button>
      </CardContent>
    </Card>
  );
}
