import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canDispatch } from "@/lib/auth";
import { computeCallDurations, formatDateTime } from "@/lib/time";
import { toCsv } from "@/lib/csv";
import type { NarrativeEntry } from "@/lib/types";

// Server-side, auth-checked CSV export — one row per call (§7.9). Column
// headers are shaped to mirror the retiring Excel workbook's dispatch-log
// layout so the two are interchangeable for CAD vendor bulk import.
const HEADERS = [
  "Call Number",
  "Received",
  "Call Source",
  "Activity Type",
  "Priority",
  "Call Type",
  "Agency Responding",
  "Jurisdiction",
  "Location Address",
  "Apt/Unit",
  "Cross Street",
  "Caller Name",
  "Caller Phone",
  "Caller Location",
  "Dispatched",
  "First Enroute",
  "First On Scene",
  "Last Cleared",
  "computed_dispatch_delay_seconds",
  "computed_response_seconds",
  "computed_total_seconds",
  "Disposition",
  "Report Taken",
  "Case Number",
  "NFIRS Number",
  "EMS Transport",
  "Destination Facility",
  "Call Taker",
  "Dispatcher",
  "Entered Into CAD",
  "CAD Call Number",
  "Back Entered By",
  "Back Entered At",
  "Verified By",
  "Verified At",
  "Status",
  "Voided",
  "Void Reason",
  "Narrative",
];

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!canDispatch(profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: outageId } = await ctx.params;
  const format = request.nextUrl.searchParams.get("format") ?? "csv";
  if (format !== "csv") {
    return NextResponse.json({ error: "Only format=csv is supported" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: calls, error } = await supabase
    .from("calls")
    .select("*")
    .eq("outage_id", outageId)
    .order("call_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profileIds = Array.from(
    new Set(
      (calls ?? []).flatMap((c) => [c.call_taker_id, c.dispatcher_id, c.back_entered_by, c.verified_by].filter(Boolean))
    )
  ) as string[];

  const { data: profiles } =
    profileIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const rows = (calls ?? []).map((c) => {
    const durations = computeCallDurations(c);
    const narrative = Array.isArray(c.narrative) ? (c.narrative as unknown as NarrativeEntry[]) : [];
    const narrativeText = narrative.map((n) => `${formatDateTime(n.at)} (${n.author}): ${n.text}`).join(" | ");

    return [
      c.call_number,
      formatDateTime(c.received_at),
      c.call_source,
      c.activity_type,
      c.priority ?? "",
      c.call_type ?? "",
      c.agency_responding ?? "",
      c.jurisdiction ?? "",
      c.location_address ?? "",
      c.location_apt ?? "",
      c.cross_street ?? "",
      c.caller_name ?? "",
      c.caller_phone ?? "",
      c.caller_location ?? "",
      formatDateTime(c.dispatched_at),
      formatDateTime(c.first_enroute_at),
      formatDateTime(c.first_on_scene_at),
      formatDateTime(c.last_cleared_at),
      durations.dispatchDelaySeconds ?? "",
      durations.responseSeconds ?? "",
      durations.totalSeconds ?? "",
      c.disposition ?? "",
      c.report_taken === null ? "" : c.report_taken ? "Y" : "N",
      c.case_number ?? "",
      c.nfirs_number ?? "",
      c.ems_transport ?? "",
      c.destination_facility ?? "",
      c.call_taker_id ? nameById.get(c.call_taker_id) ?? "" : "",
      c.dispatcher_id ? nameById.get(c.dispatcher_id) ?? "" : "",
      c.entered_into_cad ? "Y" : "N",
      c.cad_call_number ?? "",
      c.back_entered_by ? nameById.get(c.back_entered_by) ?? "" : "",
      formatDateTime(c.back_entered_at),
      c.verified_by ? nameById.get(c.verified_by) ?? "" : "",
      formatDateTime(c.verified_at),
      c.status,
      c.voided ? "Y" : "N",
      c.void_reason ?? "",
      narrativeText,
    ];
  });

  const csv = toCsv(HEADERS, rows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="outage-${outageId}-calls.csv"`,
    },
  });
}
