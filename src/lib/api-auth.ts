import "server-only";
import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/services/api-keys";
import { ServiceError } from "@/lib/services/entities";

export interface ApiContext {
  orgId: string;
}

/** Authenticate a REST request via `Authorization: Bearer lk_…`. */
export async function authenticateApi(req: Request): Promise<ApiContext | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const resolved = await resolveApiKey(header.slice(7).trim());
  return resolved ? { orgId: resolved.orgId } : null;
}

export function unauthorized() {
  return NextResponse.json(
    { error: "Missing or invalid API key" },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
  );
}

/** Map a thrown error onto a JSON response with the right status. */
export function apiError(err: unknown) {
  if (err instanceof ServiceError) {
    return NextResponse.json(
      { error: err.message, ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}) },
      { status: err.status }
    );
  }
  console.error("API error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/** Wrap a handler with API-key auth so every route is org-scoped by construction. */
export function withApiAuth<T extends unknown[]>(
  handler: (req: Request, ctx: ApiContext, ...rest: T) => Promise<Response>
) {
  return async (req: Request, ...rest: T): Promise<Response> => {
    const ctx = await authenticateApi(req);
    if (!ctx) return unauthorized();
    try {
      return await handler(req, ctx, ...rest);
    } catch (err) {
      return apiError(err);
    }
  };
}
