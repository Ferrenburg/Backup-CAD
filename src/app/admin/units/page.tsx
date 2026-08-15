import { createClient } from "@/lib/supabase/server";
import { UnitsTable } from "./units-table";

export default async function AdminUnitsPage() {
  const supabase = await createClient();
  const { data: units } = await supabase.from("units").select("*").order("sort_order");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-lg font-semibold text-fg">Units</h1>
      <p className="mb-4 text-sm text-fg-muted">
        Never hard-deleted — deactivate a unit instead so historical records stay intact.
      </p>
      <UnitsTable units={units ?? []} />
    </div>
  );
}
