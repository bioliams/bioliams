"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FieldDef } from "@/db/schema/lims";
import { Button } from "@/components/ui/button";
import { EntityDialog } from "@/components/entity-dialog";
import { SplitDialog } from "./split-dialog";
import { deleteEntityAction } from "@/app/(app)/t/[slug]/actions";

export function EntityDetailActions({
  type,
  entity,
  locations,
  stock,
}: {
  type: { name: string; slug: string; fields: FieldDef[]; isInventory: boolean };
  entity: {
    id: string;
    name: string;
    status: string;
    data: Record<string, unknown>;
    locationId: string | null;
  };
  locations: { id: string; name: string; kind: string }[];
  stock: { quantity: string; unit: string } | null;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    const result = await deleteEntityAction(entity.id, type.slug);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Record archived");
    router.push(`/t/${type.slug}`);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => setEditOpen(true)}>
        Edit
      </Button>
      <Button variant="outline" onClick={() => setSplitOpen(true)}>
        Split
      </Button>
      <Button variant={confirming ? "destructive" : "outline"} onClick={handleDelete}>
        {confirming ? "Confirm delete" : "Delete"}
      </Button>
      <EntityDialog
        key={`${entity.id}-${editOpen}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        type={type}
        locations={locations}
        entity={entity}
      />
      <SplitDialog
        open={splitOpen}
        onOpenChange={setSplitOpen}
        entityId={entity.id}
        entityName={entity.name}
        slug={type.slug}
        unit={stock?.unit ?? null}
        available={stock?.quantity ?? null}
        locations={locations}
      />
    </div>
  );
}
