"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadAttachmentAction, deleteAttachmentAction } from "./attachment-actions";

export function AttachmentsPanel({
  entityId,
  typeSlug,
  displayId,
  files,
}: {
  entityId: string;
  typeSlug: string;
  displayId: string;
  files: { id: string; fileName: string; sizeBytes: number }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setPending(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadAttachmentAction(entityId, typeSlug, displayId, formData);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Uploaded ${file.name}`);
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    const result = await deleteAttachmentAction(id, typeSlug, displayId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Removed ${name}`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Attachments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => fileInput.current?.click()}
        >
          {pending ? "Uploading…" : "Attach a file"}
        </Button>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing attached yet — CoAs, gel images, datasheets.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2">
                <a
                  href={`/api/attachments/${f.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate hover:underline"
                >
                  {f.fileName}
                </a>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {(f.sizeBytes / 1024).toFixed(0)} KB
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(f.id, f.fileName)}
                  >
                    Remove
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
