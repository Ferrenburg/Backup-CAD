"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import type { Role, LookupCategory } from "@/lib/types";

interface ActionResult {
  error: string | null;
}

export async function inviteUserAction(
  email: string,
  fullName: string,
  role: Role,
  agency: string
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) return { error: "Admin only." };
  if (!email.trim() || !fullName.trim()) return { error: "Email and name are required." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not configured on this deployment — user invites require it.",
    };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email.trim(), {
    data: { full_name: fullName.trim() },
  });
  if (error) return { error: error.message };

  // The signup trigger already created a `readonly` profile row — apply
  // the role/agency the admin actually chose.
  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role, agency, full_name: fullName.trim() })
    .eq("id", data.user.id);

  if (updateError) return { error: updateError.message };
  revalidatePath("/admin/users");
  return { error: null };
}

/**
 * Clears every MFA factor enrolled on a user's account. This does not
 * exempt them from the MFA requirement (§6.3 requires it for every
 * account, enforced by proxy.ts regardless of this) — it forces them back
 * through /mfa/enroll on their next login, which is the fix for "lost my
 * phone" / "reinstalled my authenticator app" rather than a bypass.
 */
export async function resetMfaAction(profileId: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) return { error: "Admin only." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error: "SUPABASE_SERVICE_ROLE_KEY is not configured on this deployment — MFA reset requires it.",
    };
  }

  const { data, error: listError } = await admin.auth.admin.mfa.listFactors({ userId: profileId });
  if (listError) return { error: listError.message };

  for (const factor of data.factors) {
    const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId: profileId,
    });
    if (deleteError) return { error: deleteError.message };
  }

  revalidatePath("/admin/users");
  return { error: null };
}

export async function updateProfileAction(
  profileId: string,
  patch: { role?: Role; active?: boolean; agency?: string; badge_id?: string | null; mfa_exempt?: boolean }
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) return { error: "Admin only." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", profileId);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { error: null };
}

export async function upsertUnitAction(
  id: string,
  agency: string,
  unitType: string | null,
  sortOrder: number
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) return { error: "Admin only." };
  if (!id.trim()) return { error: "Unit id is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("units")
    .upsert({ id: id.trim(), agency, unit_type: unitType, sort_order: sortOrder });
  if (error) return { error: error.message };
  revalidatePath("/admin/units");
  return { error: null };
}

export async function setUnitActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) return { error: "Admin only." };

  const supabase = await createClient();
  const { error } = await supabase.from("units").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/units");
  return { error: null };
}

export async function upsertLookupAction(
  category: LookupCategory,
  value: string,
  sortOrder: number
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) return { error: "Admin only." };
  if (!value.trim()) return { error: "Value is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("lookups")
    .upsert({ category, value: value.trim(), sort_order: sortOrder }, { onConflict: "category,value" });
  if (error) return { error: error.message };
  revalidatePath("/admin/lookups");
  return { error: null };
}

export async function setLookupActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) return { error: "Admin only." };

  const supabase = await createClient();
  const { error } = await supabase.from("lookups").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/lookups");
  return { error: null };
}
