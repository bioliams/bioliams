import "server-only";
import { notFound } from "next/navigation";
import { ServiceError } from "@/lib/services/entities";

/**
 * Turn a "not found" service error into Next's 404 page. Anything else is a
 * genuine fault and keeps bubbling up to the error boundary.
 */
export function notFoundOn404(err: unknown): never {
  if (err instanceof ServiceError && err.status === 404) notFound();
  throw err;
}
