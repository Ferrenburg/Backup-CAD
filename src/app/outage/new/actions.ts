"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canSupervise } from "@/lib/auth";

export interface DeclareOutageState {
  error: string | null;
}

export async function declareOutageAction(
  _prev: DeclareOutageState,
  formData: FormData
): Promise<DeclareOutageState> {
  const profile = await getCurrentProfile();
  if (!canSupervise(profile)) {
    return { error: "Only a supervisor or admin can declare an outage." };
  }

  const event_number = String(formData.get("event_number") ?? "").trim();
  const failure_detected_at = String(formData.get("failure_detected_at") ?? "");
  const detected_by = String(formData.get("detected_by") ?? "").trim();
  const failure_nature = String(formData.get("failure_nature") ?? "").trim() || null;
  const systems_still_operational =
    String(formData.get("systems_still_operational") ?? "").trim() || null;
  const paper_forms_used = formData.get("paper_forms_used") === "on";

  if (!event_number || !failure_detected_at || !detected_by) {
    return { error: "Event number, failure detected time, and detected-by are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outages")
    .insert({
      event_number,
      failure_detected_at: new Date(failure_detected_at).toISOString(),
      detected_by,
      failure_nature,
      systems_still_operational,
      paper_forms_used,
      manual_logging_started_at: new Date().toISOString(),
      opened_by: profile!.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  redirect(`/outage/${data.id}`);
}
