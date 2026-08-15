"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canSupervise } from "@/lib/auth";
import type { NotificationKey, NotificationsLog, Outage } from "@/lib/types";
import type { Json } from "@/lib/supabase/database.types";

type OutageUpdate = Partial<Outage>;

interface ActionResult {
  error: string | null;
}

export async function stampNotificationAction(
  outageId: string,
  key: NotificationKey,
  by: string,
  method: string
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!canSupervise(profile)) return { error: "Only a supervisor or admin can update the outage record." };

  const supabase = await createClient();
  const { data: outage, error: fetchError } = await supabase
    .from("outages")
    .select("notifications")
    .eq("id", outageId)
    .single();
  if (fetchError) return { error: fetchError.message };

  const notifications = (outage.notifications ?? {}) as NotificationsLog;
  const updated: NotificationsLog = {
    ...notifications,
    [key]: { at: new Date().toISOString(), by, method },
  };

  const { error } = await supabase
    .from("outages")
    .update({ notifications: updated as unknown as Json })
    .eq("id", outageId);
  if (error) return { error: error.message };
  revalidatePath(`/outage/${outageId}/notifications`);
  return { error: null };
}

export interface CloseOutageInput {
  cad_restored_at: string;
  restoration_confirmed_by: string;
  back_entry_started_at: string | null;
  back_entry_completed_at: string | null;
  back_entry_performed_by: string | null;
  back_entry_verified_by: string | null;
  gaps_found: boolean;
  aar_required: boolean;
  notes: string | null;
  overrideReason: string | null;
}

export async function closeOutageAction(
  outageId: string,
  input: CloseOutageInput
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!canSupervise(profile)) return { error: "Only a supervisor or admin can close an outage." };

  if (
    input.back_entry_verified_by &&
    input.back_entry_performed_by &&
    input.back_entry_verified_by.trim().toLowerCase() === input.back_entry_performed_by.trim().toLowerCase()
  ) {
    return { error: "Back-entry verifier must be a different person than whoever performed the back-entry." };
  }

  const supabase = await createClient();

  const { count: unenteredCount } = await supabase
    .from("calls")
    .select("id", { count: "exact", head: true })
    .eq("outage_id", outageId)
    .eq("entered_into_cad", false);

  if ((unenteredCount ?? 0) > 0 && !input.overrideReason?.trim()) {
    return {
      error: `${unenteredCount} call(s) are not yet entered into CAD. Closing requires a written override reason.`,
    };
  }

  const { data: lastCall } = await supabase
    .from("calls")
    .select("call_number")
    .eq("outage_id", outageId)
    .order("call_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let notes = input.notes ?? "";
  if ((unenteredCount ?? 0) > 0 && input.overrideReason?.trim()) {
    const stamp = `[CLOSEOUT OVERRIDE — closed with ${unenteredCount} call(s) not yet entered into CAD, by ${profile!.full_name} at ${new Date().toISOString()}] ${input.overrideReason.trim()}`;
    notes = notes ? `${notes}\n\n${stamp}` : stamp;
  }

  const { error } = await supabase
    .from("outages")
    .update({
      cad_restored_at: input.cad_restored_at,
      restoration_confirmed_by: input.restoration_confirmed_by,
      back_entry_started_at: input.back_entry_started_at,
      back_entry_completed_at: input.back_entry_completed_at,
      back_entry_performed_by: input.back_entry_performed_by,
      back_entry_verified_by: input.back_entry_verified_by,
      gaps_found: input.gaps_found,
      aar_required: input.aar_required,
      notes: notes || null,
      last_call_number_issued: lastCall?.call_number ?? null,
      status: "closed",
    })
    .eq("id", outageId);

  if (error) return { error: error.message };
  revalidatePath(`/outage/${outageId}`);
  return { error: null };
}

export async function markRestoredAction(outageId: string, restoredAt: string, confirmedBy: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!canSupervise(profile)) return { error: "Only a supervisor or admin can update the outage record." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("outages")
    .update({ cad_restored_at: restoredAt, restoration_confirmed_by: confirmedBy, status: "restored" })
    .eq("id", outageId);

  if (error) return { error: error.message };
  revalidatePath(`/outage/${outageId}`);
  return { error: null };
}

export async function updateOutageFieldsAction(
  outageId: string,
  patch: Record<string, string | boolean | null>
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!canSupervise(profile)) return { error: "Only a supervisor or admin can update the outage record." };

  const supabase = await createClient();
  const { error } = await supabase.from("outages").update(patch as OutageUpdate).eq("id", outageId);
  if (error) return { error: error.message };
  revalidatePath(`/outage/${outageId}`);
  return { error: null };
}
