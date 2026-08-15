import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { DeclareOutageForm } from "./form";

async function suggestEventNumber(): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("outages")
    .select("id", { count: "exact", head: true })
    .like("event_number", `CAD-OUT-${year}-%`);
  const n = (count ?? 0) + 1;
  return `CAD-OUT-${year}-${String(n).padStart(2, "0")}`;
}

export default async function NewOutagePage() {
  const [profile, suggested] = await Promise.all([getCurrentProfile(), suggestEventNumber()]);

  return (
    <main className="flex min-h-screen flex-1 justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-xl">
        <h1 className="text-xl font-semibold text-fg">Declare a CAD downtime event</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Opened by {profile?.full_name}. Every call logged afterward belongs to this
          outage until it is closed.
        </p>
        <DeclareOutageForm suggestedEventNumber={suggested} detectedByDefault={profile?.full_name ?? ""} />
      </div>
    </main>
  );
}
