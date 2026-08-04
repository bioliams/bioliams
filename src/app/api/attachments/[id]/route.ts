import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/tenant";
import { getAttachment, readAttachmentBytes } from "@/lib/services/attachments";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrg();

  try {
    const row = await getAttachment(ctx.orgId, id);
    const bytes = await readAttachmentBytes(row.storagePath);
    return new NextResponse(bytes as BodyInit, {
      headers: {
        "Content-Type": row.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(row.fileName)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
