"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROLES, ROLE_DESCRIPTIONS } from "@/lib/permissions";
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
  const [pending, startTransition] = useTransition();

  if (disabled) return <span className="text-sm">{role}</span>;

  return (
    <select
      value={role}
      disabled={pending}
      aria-label="Role"
      className="h-8 rounded-md border bg-background px-2 text-sm"
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          const result = await setMemberRoleAction(memberId, next);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(`Role changed to ${next}`);
          router.refresh();
        });
      }}
    >
      {ROLES.map((r) => (
        <option key={r} value={r} title={ROLE_DESCRIPTIONS[r]}>
          {r}
        </option>
      ))}
    </select>
  );
}
