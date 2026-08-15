import { getCurrentProfile } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function PendingPage() {
  const profile = await getCurrentProfile();

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 text-center">
        <h1 className="text-lg font-semibold text-fg">Access pending</h1>
        <p className="mt-2 text-sm text-fg-muted">
          {profile
            ? `Your account (${profile.full_name}) is signed in but has not been assigned a
               role yet. An administrator needs to assign you a role before you can use the
               log.`
            : "Your account has not been assigned a role yet. An administrator needs to assign you a role before you can use the log."}
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
