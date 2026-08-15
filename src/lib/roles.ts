import type { Role } from "./types";

// Pure role-check helpers, safe to import from both client and server code
// (no Supabase client dependency). This is a UX convenience layer only —
// RLS is the actual enforcement boundary.
export function roleAllows(role: string | null | undefined, active: boolean, allowed: Role[]): boolean {
  if (!active || !role) return false;
  return (allowed as string[]).includes(role);
}

export const canDispatch = (role: string | null | undefined, active: boolean) =>
  roleAllows(role, active, ["dispatcher", "supervisor", "admin"]);
export const canSupervise = (role: string | null | undefined, active: boolean) =>
  roleAllows(role, active, ["supervisor", "admin"]);
export const isAdminRole = (role: string | null | undefined, active: boolean) =>
  roleAllows(role, active, ["admin"]);
