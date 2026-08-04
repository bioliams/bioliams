"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createOrganizationAction } from "./actions";

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createOrganizationAction(name);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Set up your lab</CardTitle>
        <CardDescription>
          We&apos;ll create starter record types (Sample, Reagent, Primer) and a demo freezer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org">Lab / organization name</Label>
            <Input
              id="org"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Smith Lab"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating…" : "Create lab"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
