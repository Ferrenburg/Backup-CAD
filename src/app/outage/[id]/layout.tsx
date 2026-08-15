import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { BoardProvider } from "@/components/board/board-context";
import { BoardShell } from "@/components/board/board-shell";

export default async function OutageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile) notFound();

  const [{ data: outage }, { data: calls }, { data: units }, { data: lookups }] = await Promise.all([
    supabase.from("outages").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("calls")
      .select("*")
      .eq("outage_id", id)
      .order("received_at", { ascending: false }),
    supabase.from("units").select("*").eq("active", true).order("sort_order"),
    supabase.from("lookups").select("*").eq("active", true).order("sort_order"),
  ]);

  if (!outage) notFound();

  const callIds = (calls ?? []).map((c) => c.id);
  const { data: unitAssignments } =
    callIds.length > 0
      ? await supabase.from("unit_assignments").select("*").in("call_id", callIds)
      : { data: [] };

  return (
    <BoardProvider
      outage={outage}
      profile={profile}
      initialCalls={calls ?? []}
      initialUnitAssignments={unitAssignments ?? []}
      units={units ?? []}
      lookups={lookups ?? []}
    >
      <BoardShell>{children}</BoardShell>
    </BoardProvider>
  );
}
