"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/initials";
import { useT } from "@/i18n/client";
import { LanguageMenuItems } from "@/components/language-menu";
import { ROLES, type Role } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Shrink a chosen photo to a small square JPEG data URL.
 *
 * At 128px it lands well under 20KB, which is cheap enough to live in the user
 * row itself — no storage bucket to configure, and it survives any backend.
 */
async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // Cover-crop the centre square rather than squashing a rectangular photo.
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size
  );
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function UserMenu({
  name,
  role,
  image,
}: {
  name: string;
  role: string;
  image?: string | null;
}) {
  const router = useRouter();
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  async function handlePhoto(file: File) {
    setPending(true);
    try {
      const dataUrl = await toAvatarDataUrl(file);
      const { error } = await authClient.updateUser({ image: dataUrl });
      if (error) throw new Error(error.message ?? t("nav.userMenu.uploadFailed"));
      toast.success(t("nav.userMenu.photoUpdated"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("nav.userMenu.unreadable"));
    } finally {
      setPending(false);
    }
  }

  async function removePhoto() {
    const { error } = await authClient.updateUser({ image: null });
    if (error) {
      toast.error(error.message ?? t("nav.userMenu.removeFailed"));
      return;
    }
    toast.success(t("nav.userMenu.photoRemoved"));
    router.refresh();
  }

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhoto(file);
          e.target.value = "";
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Avatar className="size-6">
              {image && <AvatarImage src={image} alt="" />}
              <AvatarFallback className="bg-accent text-[10px] font-semibold text-accent-foreground">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="font-normal text-muted-foreground">
            {t("nav.userMenu.role", {
              role: (ROLES as readonly string[]).includes(role) ? t(`roles.${role as Role}`) : role,
            })}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={pending} onClick={() => fileInput.current?.click()}>
            {pending
              ? t("nav.userMenu.uploading")
              : image
                ? t("nav.userMenu.changePhoto")
                : t("nav.userMenu.addPhoto")}
          </DropdownMenuItem>
          {image && (
            <DropdownMenuItem onClick={removePhoto}>{t("nav.userMenu.removePhoto")}</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <LanguageMenuItems />
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>{t("nav.userMenu.signOut")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
