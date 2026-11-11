import { ServiceError } from "@/lib/service-error";
import { getT } from "@/i18n/server";
import { translateServerMessage } from "@/i18n/server-errors";

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

/** A thrown error as an action result, in the language of whoever triggered it. */
export async function actionError(err: unknown): Promise<ActionResult<never>> {
  const t = await getT();
  const say = (message: string) => translateServerMessage(message, t);
  if (err instanceof ServiceError) {
    return {
      error: say(err.message),
      fieldErrors: err.fieldErrors
        ? Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, say(v)]))
        : undefined,
    };
  }
  return { error: err instanceof Error ? say(err.message) : t("errors.generic") };
}
