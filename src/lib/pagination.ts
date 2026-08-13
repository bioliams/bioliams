/**
 * Rows per page in a registry.
 *
 * Lives here rather than in the view because a "use client" module's exports
 * reach a server component as client references, not values — importing it
 * there made the query's LIMIT silently disappear.
 */
export const PAGE_SIZE = 50;
