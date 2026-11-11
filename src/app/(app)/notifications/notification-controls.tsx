"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markReadAction } from "./actions";

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markReadAction();
          if (result.error) toast.error(result.error);
          router.refresh();
        })
      }
    >
      Mark all read
    </Button>
  );
}

/** A link to the record that also marks the alarm read on the way. */
export function OpenAlarmLink({
  id,
  read,
  href,
  className,
  children,
}: {
  id: string;
  read: boolean;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (!read) void markReadAction([id]);
      }}
    >
      {children}
    </Link>
  );
}
