import { createClient } from "@/lib/supabase/server";
import { LOOKUP_CATEGORIES } from "@/lib/types";
import { LookupsTable } from "./lookups-table";

export default async function AdminLookupsPage() {
  const supabase = await createClient();
  const { data: lookups } = await supabase.from("lookups").select("*").order("category").order("sort_order");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-lg font-semibold text-fg">Lookups</h1>
      <p className="mb-4 text-sm text-fg-muted">
        Never hard-deleted — deactivate a value instead so historical records stay intact.
      </p>
      <div className="space-y-8">
        {LOOKUP_CATEGORIES.map((category) => (
          <LookupsTable
            key={category}
            category={category}
            items={(lookups ?? []).filter((l) => l.category === category)}
          />
        ))}
      </div>
    </div>
  );
}
