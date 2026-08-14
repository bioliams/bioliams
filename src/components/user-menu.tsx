"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/initials";
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
      if (error) throw new Error(error.message ?? "Upload failed");
      toast.success("Profile picture updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that image");
    } finally {
      setPending(false);
    }
  }

  async function removePhoto() {
    const { error } = await authClient.updateUser({ image: null });
    if (error) {
      toast.error(error.message ?? "Could not remove the picture");
      return;
    }
    toast.success("Profile picture removed");
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
            Role: {role}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={pending} onClick={() => fileInput.current?.click()}>
            {pending ? "Uploading…" : image ? "Change profile picture" : "Add a profile picture"}
          </DropdownMenuItem>
          {image && (
            <DropdownMenuItem onClick={removePhoto}>Remove picture</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
