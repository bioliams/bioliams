import { ServiceError } from "@/lib/service-error";

/**
 * Roles, as a lab actually divides work.
 *
 * Capabilities rather than a rank order: a storage manager reorganises freezers
 * without being trusted to redefine what a Sample is, and a rotating student
 * can be read-only without being outside the lab.
 */
export const ROLES = ["owner", "admin", "member", "storage", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export type Capability =
  | "records:write" // register, edit, consume, split, attach
  | "storage:write" // create and rearrange locations
  | "schema:write" // define record types and their fields
  | "members:manage" // invite people, change roles
  | "keys:manage"; // issue and revoke API keys

const CAPABILITIES: Record<Role, Capability[]> = {
  owner: ["records:write", "storage:write", "schema:write", "members:manage", "keys:manage"],
  admin: ["records:write", "storage:write", "schema:write", "members:manage", "keys:manage"],
  member: ["records:write", "storage:write"],
  storage: ["records:write", "storage:write"],
  viewer: [],
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Full access, including members and record types",
  admin: "Full access, including members and record types",
  member: "Register and edit records, use stock, manage storage",
  storage: "Manage storage and stock, no schema or member changes",
  viewer: "Read-only — can search and export, cannot change anything",
};

export function can(role: string, capability: Capability): boolean {
  return CAPABILITIES[role as Role]?.includes(capability) ?? false;
}

/**
 * The server-side gate. Render-time hiding of a button is a courtesy; this is
 * the boundary, so every mutating action calls it before doing anything.
 */
export function requireCan(role: string, capability: Capability): void {
  if (!can(role, capability)) {
    throw new ServiceError(
      "Your role in this lab doesn't allow that. Ask an admin if you need access.",
      403
    );
  }
}
