"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/i18n/client";

export function InviteForm() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const { error } = await authClient.organization.inviteMember({
      email,
      role: role as "member" | "admin" | "owner",
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? t("settings.members.inviteFailed"));
      return;
    }
    toast.success(t("settings.members.invited", { email }));
    setEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-wrap gap-2">
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("settings.members.emailPlaceholder")}
        dir="ltr"
        className="flex-1"
        required
      />
      <Select value={role} onValueChange={setRole}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="member">{t("roles.member")}</SelectItem>
          <SelectItem value="admin">{t("roles.admin")}</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" disabled={pending}>
        {pending ? t("settings.members.inviting") : t("settings.members.invite")}
      </Button>
    </form>
  );
}
