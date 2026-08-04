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

export function InviteForm() {
  const router = useRouter();
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
      toast.error(error.message ?? "Could not send invitation");
      return;
    }
    toast.success(`Invited ${email}`);
    setEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-wrap gap-2">
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="colleague@lab.org"
        className="flex-1"
        required
      />
      <Select value={role} onValueChange={setRole}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="member">Member</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" disabled={pending}>
        {pending ? "Inviting…" : "Invite"}
      </Button>
    </form>
  );
}
