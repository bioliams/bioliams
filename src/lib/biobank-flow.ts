/**
 * Who may move a biobank request where.
 *
 * Two parties: the biobank (whoever holds biobank:manage) does the work, and
 * the requester can withdraw a request or confirm they've picked it up. Kept
 * free of the database so the rules can be tested and shown in the UI from
 * the same source.
 */

export const BIOBANK_STATUSES = [
  "requested",
  "processing",
  "ready",
  "collected",
  "declined",
  "cancelled",
] as const;
export type BiobankStatus = (typeof BIOBANK_STATUSES)[number];

export const STATUS_LABELS: Record<BiobankStatus, string> = {
  requested: "Requested",
  processing: "Processing",
  ready: "Ready for pickup",
  collected: "Collected",
  declined: "Declined",
  cancelled: "Cancelled",
};

export const OPEN_STATUSES: BiobankStatus[] = ["requested", "processing", "ready"];

type Actor = "biobank" | "requester";

const BIOBANK_NEXT: Record<BiobankStatus, BiobankStatus[]> = {
  requested: ["processing", "ready", "declined"],
  processing: ["ready", "declined"],
  ready: ["collected", "processing"], // back to processing if something turned up wrong
  collected: [],
  declined: ["requested"], // reopen
  cancelled: [],
};

const REQUESTER_NEXT: Record<BiobankStatus, BiobankStatus[]> = {
  requested: ["cancelled"],
  processing: ["cancelled"],
  ready: ["collected"],
  collected: [],
  declined: [],
  cancelled: [],
};

export function allowedNext(from: BiobankStatus, as: Actor[]): BiobankStatus[] {
  const out = new Set<BiobankStatus>();
  if (as.includes("biobank")) BIOBANK_NEXT[from].forEach((s) => out.add(s));
  if (as.includes("requester")) REQUESTER_NEXT[from].forEach((s) => out.add(s));
  return BIOBANK_STATUSES.filter((s) => out.has(s));
}

/** A decline with no reason teaches nobody what to ask for instead. */
export function needsResponse(to: BiobankStatus) {
  return to === "declined";
}
