/**
 * Errors that carry an HTTP status and per-field messages, so one throw serves
 * both the REST API and a form. Kept apart from the services themselves so
 * client components can import permission helpers without dragging in the
 * database driver.
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly fieldErrors?: Record<string, string>
  ) {
    super(message);
  }
}
