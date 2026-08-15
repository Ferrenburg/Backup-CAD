import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canDispatch } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { toCsv } from "@/lib/csv";

// Second export endpoint (§7.9) — one row per unit assignment.
const HEADERS = [
  "Call Number",
  "Unit",
  "Agency",
  "Personnel",
  "Dispatched",
  "Enroute",
  "On Scene",
  "Transporting",
  "At Destination",
  "Cleared",
  "Unit Disposition",
  "Odometer Start",
  "Odometer End",
  "Notes",
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
  const { data: calls, error: callsError } = await supabase
    .from("calls")
    .select("id, call_number")
    .eq("outage_id", outageId)
    .order("call_number", { ascending: true });

  if (callsError) return NextResponse.json({ error: callsError.message }, { status: 500 });

  const callIds = (calls ?? []).map((c) => c.id);
  const callNumberById = new Map((calls ?? []).map((c) => [c.id, c.call_number]));

  const { data: assignments, error } =
    callIds.length > 0
      ? await supabase.from("unit_assignments").select("*").in("call_id", callIds)
      : { data: [], error: null };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unitIds = Array.from(new Set((assignments ?? []).map((a) => a.unit_id)));
  const { data: unitRows } =
    unitIds.length > 0 ? await supabase.from("units").select("id, agency").in("id", unitIds) : { data: [] };
  const agencyByUnitId = new Map((unitRows ?? []).map((u) => [u.id, u.agency]));

  const rows = (assignments ?? [])
    .sort((a, b) => (callNumberById.get(a.call_id) ?? "").localeCompare(callNumberById.get(b.call_id) ?? ""))
    .map((a) => [
      callNumberById.get(a.call_id) ?? "",
      a.unit_id,
      agencyByUnitId.get(a.unit_id) ?? "",
      a.personnel ?? "",
      formatDateTime(a.dispatched_at),
      formatDateTime(a.enroute_at),
      formatDateTime(a.on_scene_at),
      formatDateTime(a.transporting_at),
      formatDateTime(a.at_destination_at),
      formatDateTime(a.cleared_at),
      a.unit_disposition ?? "",
      a.odometer_start ?? "",
      a.odometer_end ?? "",
      a.notes ?? "",
    ]);

  const csv = toCsv(HEADERS, rows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="outage-${outageId}-units.csv"`,
    },
  });
}
