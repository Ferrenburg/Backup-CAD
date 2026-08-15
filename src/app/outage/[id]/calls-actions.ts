"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canDispatch, canSupervise } from "@/lib/auth";
import type { CallUpdate, NarrativeEntry, UnitAssignmentUpdate } from "@/lib/types";
import type { Json } from "@/lib/supabase/database.types";

export type CallTimeField =
  | "dispatched_at"
  | "first_enroute_at"
  | "first_on_scene_at"
  | "last_cleared_at";

export type UnitTimeField =
  | "dispatched_at"
  | "enroute_at"
  | "on_scene_at"
  | "transporting_at"
  | "at_destination_at"
  | "cleared_at";

interface ActionResult {
  error: string | null;
  id?: string;
}

export async function createCallAction(
  outageId: string,
  fields: {
    received_at: string;
    call_source: string;
    activity_type: string;
    priority?: string | null;
    call_type?: string | null;
    agency_responding?: string | null;
    jurisdiction?: string | null;
    location_address?: string | null;
    location_apt?: string | null;
    cross_street?: string | null;
    caller_name?: string | null;
    caller_phone?: string | null;
    caller_location?: string | null;
  }
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!canDispatch(profile)) return { error: "You do not have permission to log calls." };
  if (!fields.received_at || !fields.call_source || !fields.activity_type) {
    return { error: "Received time, call source, and activity type are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calls")
    .insert({
      outage_id: outageId,
      received_at: fields.received_at,
      call_source: fields.call_source,
      activity_type: fields.activity_type,
      priority: fields.priority ?? null,
      call_type: fields.call_type ?? null,
      agency_responding: fields.agency_responding ?? null,
      jurisdiction: fields.jurisdiction ?? null,
      location_address: fields.location_address ?? null,
      location_apt: fields.location_apt ?? null,
      cross_street: fields.cross_street ?? null,
      caller_name: fields.caller_name ?? null,
      caller_phone: fields.caller_phone ?? null,
      caller_location: fields.caller_location ?? null,
      call_taker_id: profile!.id,
      created_by: profile!.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/outage/${outageId}`);
  return { error: null, id: data.id };
}

export async function updateCallFieldsAction(
  outageId: string,
  callId: string,
  patch: Record<string, string | boolean | null>
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!canDispatch(profile)) return { error: "You do not have permission to edit calls." };

  const supabase = await createClient();
  const { error } = await supabase.from("calls").update(patch as CallUpdate).eq("id", callId);
  if (error) return { error: error.message };
  revalidatePath(`/outage/${outageId}/call/${callId}`);
  revalidatePath(`/outage/${outageId}`);
  return { error: null };
}

export async function stampCallTimeAction(
  outageId: string,
  callId: string,
  field: CallTimeField,
  iso?: string
): Promise<ActionResult> {
  return updateCallFieldsAction(outageId, callId, { [field]: iso ?? new Date().toISOString() });
}

export async function appendNarrativeAction(
  outageId: string,
  callId: string,
  text: string
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!canDispatch(profile)) return { error: "You do not have permission to edit calls." };
  if (!text.trim()) return { error: "Narrative entry is empty." };

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("calls")
    .select("narrative")
    .eq("id", callId)
    .single();
  if (fetchError) return { error: fetchError.message };

  const entries = Array.isArray(existing.narrative) ? (existing.narrative as unknown as NarrativeEntry[]) : [];
  const entry: NarrativeEntry = {
    at: new Date().toISOString(),
    author: profile!.full_name,
    text: text.trim(),
  };
  const { error } = await supabase
    .from("calls")
    .update({ narrative: [...entries, entry] as unknown as Json })
    .eq("id", callId);

  if (error) return { error: error.message };
  revalidatePath(`/outage/${outageId}/call/${callId}`);
  return { error: null };
}

export async function voidCallAction(
  outageId: string,
  callId: string,
  reason: string
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!canSupervise(profile)) return { error: "Only a supervisor or admin can void a call." };
  if (!reason.trim()) return { error: "A void reason is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("calls")
    .update({
      voided: true,
      void_reason: reason.trim(),
      voided_by: profile!.id,
      voided_at: new Date().toISOString(),
      status: "voided",
    })
    .eq("id", callId);

  if (error) return { error: error.message };
  revalidatePath(`/outage/${outageId}/call/${callId}`);
  revalidatePath(`/outage/${outageId}`);
  return { error: null };
}

export async function setCallStatusAction(
  outageId: string,
  callId: string,
  status: "active" | "cleared"
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!canDispatch(profile)) return { error: "You do not have permission to edit calls." };

  const supabase = await createClient();
  const { error } = await supabase.from("calls").update({ status }).eq("id", callId);
  if (error) return { error: error.message };
  revalidatePath(`/outage/${outageId}`);
  return { error: null };
}

export async function markEnteredIntoCadAction(
  outageId: string,
  callId: string,
  cadCallNumber: string
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!canDispatch(profile)) return { error: "You do not have permission to reconcile calls." };
  if (!cadCallNumber.trim()) return { error: "Enter the CAD call number." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("calls")
    .update({
      entered_into_cad: true,
      cad_call_number: cadCallNumber.trim(),
      back_entered_by: profile!.id,
      back_entered_at: new Date().toISOString(),
    })
    .eq("id", callId);

  if (error) return { error: error.message };
  revalidatePath(`/outage/${outageId}/reconcile`);
  return { error: null };
}

export async function verifyBackEntryAction(outageId: string, callId: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!canSupervise(profile)) return { error: "Only a supervisor or admin can verify back-entry." };

  const supabase = await createClient();
  const { data: call, error: fetchError } = await supabase
    .from("calls")
    .select("back_entered_by")
    .eq("id", callId)
    .single();
  if (fetchError) return { error: fetchError.message };
  if (call.back_entered_by === profile!.id) {
    return { error: "The verifier must be a different person than whoever performed the back-entry." };
  }

  const { error } = await supabase
    .from("calls")
    .update({ verified_by: profile!.id, verified_at: new Date().toISOString() })
    .eq("id", callId);

  if (error) return { error: error.message };
  revalidatePath(`/outage/${outageId}/reconcile`);
  return { error: null };
}

export async function addUnitAction(
  outageId: string,
  callId: string,
  unitId: string
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!canDispatch(profile)) return { error: "You do not have permission to assign units." };
  if (!unitId) return { error: "Pick a unit." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("unit_assignments")
    .insert({ call_id: callId, unit_id: unitId, dispatched_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/outage/${outageId}/call/${callId}`);
  return { error: null, id: data.id };
}

export async function updateUnitAssignmentAction(
  outageId: string,
  callId: string,
  unitAssignmentId: string,
  patch: Record<string, string | number | null>
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!canDispatch(profile)) return { error: "You do not have permission to edit unit assignments." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("unit_assignments")
    .update(patch as UnitAssignmentUpdate)
    .eq("id", unitAssignmentId);

  if (error) return { error: error.message };
  revalidatePath(`/outage/${outageId}/call/${callId}`);
  return { error: null };
}

export async function stampUnitTimeAction(
  outageId: string,
  callId: string,
  unitAssignmentId: string,
  field: UnitTimeField,
  iso?: string
): Promise<ActionResult> {
  return updateUnitAssignmentAction(outageId, callId, unitAssignmentId, {
    [field]: iso ?? new Date().toISOString(),
  });
}
