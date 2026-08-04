import { ServiceError } from "@/lib/services/entities";

/**
 * Uniform return shape for server actions. A single non-union type keeps
 * `result.error` narrowable on the client without discriminant gymnastics.
 */
export interface ActionResult<T = unknown> {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  value?: T;
}

export function actionError(err: unknown): ActionResult<never> {
  if (err instanceof ServiceError) return { error: err.message, fieldErrors: err.fieldErrors };
  return { error: err instanceof Error ? err.message : "Something went wrong" };
}
