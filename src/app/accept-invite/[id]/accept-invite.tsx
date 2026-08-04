"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AcceptInvite({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function accept() {
    setPending(true);
    const { error } = await authClient.organization.acceptInvitation({ invitationId });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Could not accept invitation");
      return;
    }
    toast.success("You've joined the lab");
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Join this lab</CardTitle>
        <CardDescription>You&apos;ve been invited to collaborate.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={accept} disabled={pending} className="w-full">
          {pending ? "Joining…" : "Accept invitation"}
        </Button>
      </CardContent>
    </Card>
  );
}
