"use client";

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
            run(() => createProjectAction(name, description), `Created ${name.trim()}`);
            setName("");
            setDescription("");
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="w-56"
            aria-label="Project name"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What it covers (optional)"
            className="w-72"
            aria-label="Project description"
          />
          <Button type="submit" disabled={pending}>
            Add project
          </Button>
        </form>
      )}

      {projects.length === 0 ? (
        <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
          No projects yet — everyone in the lab sees every record.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                {projects.map((p) => (
                  <TableHead key={p.id} className="text-center">
                    <div>{p.name}</div>
                    <div className="font-normal text-muted-foreground">
                      {p.recordCount} record{p.recordCount === 1 ? "" : "s"}
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
                        sees everything
                      </Badge>
                    )}
                  </TableCell>
                  {projects.map((project) => (
                    <TableCell key={project.id} className="text-center">
                      <Checkbox
                        checked={person.projectIds.includes(project.id)}
                        disabled={!canManage || pending}
                        aria-label={`${person.name} in ${project.name}`}
                        onCheckedChange={(checked) =>
                          run(
                            () =>
                              setProjectMemberAction(
                                project.id,
                                person.userId,
                                checked === true
                              ),
                            checked === true
                              ? `${person.name} added to ${project.name}`
                              : `${person.name} removed from ${project.name}`
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
          <h2 className="text-sm font-medium text-muted-foreground">Delete a project</h2>
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
                  run(() => deleteProjectAction(project.id), `Deleted ${project.name}`);
                }}
              >
                {confirmingDelete === project.id
                  ? `Delete — ${project.recordCount} record(s) stay, unfiled`
                  : `${project.name} ×`}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
