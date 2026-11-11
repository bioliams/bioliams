"use client";

import { useT } from "@/i18n/client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createProjectAction,
  deleteProjectAction,
  setProjectMemberAction,
} from "./actions";

interface Project {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  recordCount: number;
}

interface Person {
  userId: string;
  name: string;
  email: string;
  projectIds: string[];
}

export function ProjectsManager({
  projects,
  people,
  canManage,
}: {
  projects: Project[];
  people: Person[];
  canManage: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // Two clicks to delete: the first arms the button and names the consequence.
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error?: string }>, success: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-md border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            run(
              () => createProjectAction(name, description),
              t("settings.projects.created", { name: name.trim() })
            );
            setName("");
            setDescription("");
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("settings.projects.namePlaceholder")}
            className="w-56"
            aria-label={t("settings.projects.namePlaceholder")}
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("settings.projects.descPlaceholder")}
            className="w-72"
            aria-label={t("settings.projects.descLabel")}
          />
          <Button type="submit" disabled={pending}>
            {t("settings.projects.add")}
          </Button>
        </form>
      )}

      {projects.length === 0 ? (
        <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
          {t("settings.projects.none")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("settings.projects.person")}</TableHead>
                {projects.map((p) => (
                  <TableHead key={p.id} className="text-center">
                    <div>{p.name}</div>
                    <div className="font-normal text-muted-foreground">
                      {t("settings.projects.recordCount", { count: p.recordCount })}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((person) => (
                <TableRow key={person.userId}>
                  <TableCell>
                    <div className="font-medium">{person.name}</div>
                    <div className="text-xs text-muted-foreground">{person.email}</div>
                    {person.projectIds.length === 0 && (
                      <Badge variant="secondary" className="mt-1">
                        {t("settings.projects.seesEverything")}
                      </Badge>
                    )}
                  </TableCell>
                  {projects.map((project) => (
                    <TableCell key={project.id} className="text-center">
                      <Checkbox
                        checked={person.projectIds.includes(project.id)}
                        disabled={!canManage || pending}
                        aria-label={t("settings.projects.memberIn", {
                          person: person.name,
                          project: project.name,
                        })}
                        onCheckedChange={(checked) =>
                          run(
                            () =>
                              setProjectMemberAction(
                                project.id,
                                person.userId,
                                checked === true
                              ),
                            checked === true
                              ? t("settings.projects.added", { person: person.name, project: project.name })
                              : t("settings.projects.removed", { person: person.name, project: project.name })
                          )
                        }
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {canManage && projects.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("settings.projects.deleteTitle")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => (
              <Button
                key={project.id}
                variant={confirmingDelete === project.id ? "destructive" : "outline"}
                size="sm"
                disabled={pending}
                onBlur={() => setConfirmingDelete(null)}
                onClick={() => {
                  if (confirmingDelete !== project.id) {
                    setConfirmingDelete(project.id);
                    return;
                  }
                  setConfirmingDelete(null);
                  run(
                    () => deleteProjectAction(project.id),
                    t("settings.projects.deleted", { name: project.name })
                  );
                }}
              >
                {confirmingDelete === project.id
                  ? t("settings.projects.confirmDelete", { count: project.recordCount })
                  : `${project.name} ×`}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
