import { createClient } from "./supabase/server";
import type { Profile } from "./types";
import { canDispatch as canDispatchRole, canSupervise as canSuperviseRole, isAdminRole } from "./roles";

/** Current authenticated user's profile, or null if unauthenticated / no profile row yet. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
}

export const canDispatch = (p: Profile | null) => canDispatchRole(p?.role, p?.active ?? false);
export const canSupervise = (p: Profile | null) => canSuperviseRole(p?.role, p?.active ?? false);
export const isAdmin = (p: Profile | null) => isAdminRole(p?.role, p?.active ?? false);
