import { createClient } from "@/lib/supabase/server";
import { UserRow } from "./user-row";
import { InviteForm } from "./invite-form";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-lg font-semibold text-fg">Users</h1>

      <InviteForm />

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-dim">
            <th className="py-2 pr-3">Name</th>
            <th className="py-2 pr-3">Agency</th>
            <th className="py-2 pr-3">Badge</th>
            <th className="py-2 pr-3">Role</th>
            <th className="py-2 pr-3">Active</th>
          </tr>
        </thead>
        <tbody>
          {(profiles ?? []).map((p) => (
            <UserRow key={p.id} profile={p} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
