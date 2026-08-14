"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createApiKeyAction, revokeApiKeyAction } from "./actions";

export interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export function ApiKeysManager({ keys }: { keys: ApiKeyRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await createApiKeyAction(name);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setNewKey(result.value ?? null);
    setName("");
    router.refresh();
  }

  async function handleRevoke(id: string) {
    const result = await revokeApiKeyAction(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Key revoked");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">API keys</h1>
        <p className="text-sm text-muted-foreground">
          Use these with the REST API at <code>/api/v1</code>. Keys are scoped to this lab.
        </p>
      </div>

      {newKey && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">Copy your new key now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <code className="block overflow-x-auto rounded bg-muted p-3 text-sm">{newKey}</code>
            <p className="text-xs text-muted-foreground">
              This is the only time it will be shown — it&apos;s stored hashed.
            </p>
            <Button size="sm" variant="outline" onClick={() => setNewKey(null)}>
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleCreate} className="flex max-w-md gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. Jupyter notebook)"
          required
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create key"}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((k) => (
              <TableRow key={k.id}>
                <TableCell>{k.name}</TableCell>
                <TableCell className="font-mono text-xs">{k.keyPrefix}…</TableCell>
                <TableCell className="text-muted-foreground">
                  {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(k.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleRevoke(k.id)}>
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {keys.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No API keys yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
