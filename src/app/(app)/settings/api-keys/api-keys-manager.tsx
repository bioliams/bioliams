"use client";

import { useT } from "@/i18n/client";
import { formatDate, formatDateTime } from "@/i18n/format";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
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
  const t = useT();
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
    toast.success(t("settings.apiKeys.revoked"));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("settings.apiKeys.title")}
        description={
          <>
            {t("settings.apiKeys.descBefore")} <code>/api/v1</code>
            {t("settings.apiKeys.descAfter")}
          </>
        }
      />

      {newKey && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">{t("settings.apiKeys.copyNow")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <code className="block overflow-x-auto rounded bg-muted p-3 text-sm">{newKey}</code>
            <p className="text-xs text-muted-foreground">
              {t("settings.apiKeys.onlyOnce")}
            </p>
            <Button size="sm" variant="outline" onClick={() => setNewKey(null)}>
              {t("settings.apiKeys.done")}
            </Button>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleCreate} className="flex max-w-md gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("settings.apiKeys.namePlaceholder")}
          required
        />
        <Button type="submit" disabled={pending}>
          {pending ? t("settings.apiKeys.creating") : t("settings.apiKeys.create")}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("settings.apiKeys.key")}</TableHead>
              <TableHead>{t("settings.apiKeys.lastUsed")}</TableHead>
              <TableHead>{t("common.created")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((k) => (
              <TableRow key={k.id}>
                <TableCell>{k.name}</TableCell>
                <TableCell className="font-mono text-xs">{k.keyPrefix}…</TableCell>
                <TableCell className="text-muted-foreground">
                  {k.lastUsedAt ? formatDateTime(k.lastUsedAt, t.locale) : t("settings.apiKeys.never")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(k.createdAt, t.locale)}
                </TableCell>
                <TableCell className="text-end">
                  <Button variant="ghost" size="sm" onClick={() => handleRevoke(k.id)}>
                    {t("settings.apiKeys.revoke")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {keys.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {t("settings.apiKeys.none")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
