"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROLES, type Role } from "@/lib/permissions";
import { useT } from "@/i18n/client";
import { setMemberRoleAction } from "./actions";

export function RoleSelect({
  memberId,
  role,
  disabled,
}: {
  memberId: string;
  role: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();

  if (disabled)
    return (
      <span className="text-sm">
        {(ROLES as readonly string[]).includes(role) ? t(`roles.${role as Role}`) : role}
      </span>
    );

  return (
    <select
      value={role}
      disabled={pending}
      aria-label={t("settings.members.role")}
      className="h-8 rounded-md border bg-background px-2 text-sm"
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          const result = await setMemberRoleAction(memberId, next);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(
            t("settings.members.roleChanged", {
              role: (ROLES as readonly string[]).includes(next) ? t(`roles.${next as Role}`) : next,
            })
          );
          router.refresh();
        });
      }}
    >
      {ROLES.map((r) => (
        <option key={r} value={r} title={t(`roles.desc.${r}`)}>
          {t(`roles.${r}`)}
        </option>
      ))}
    </select>
  );
}
