import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) notFound();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-fg-dim hover:text-fg">
            ← Board
          </Link>
          <span className="text-sm font-semibold text-fg">Admin</span>
          <nav className="flex gap-3 text-sm">
            <Link href="/admin/users" className="text-fg-muted hover:text-fg">
              Users
            </Link>
            <Link href="/admin/units" className="text-fg-muted hover:text-fg">
              Units
            </Link>
            <Link href="/admin/lookups" className="text-fg-muted hover:text-fg">
              Lookups
            </Link>
          </nav>
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
