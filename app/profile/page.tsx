import { getSession } from "@auth0/nextjs-auth0";
import { redirect } from "next/navigation";
import WalletPreferences from "@/components/profile/WalletPreferences";
import WorkspaceShell from "@/components/layout/WorkspaceShell";
import ThemeToggle from "@/components/ThemeToggle";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/api/auth/login?returnTo=/profile");
  }

  const displayName = session.user.name ?? session.user.nickname ?? "Eco Player";
  const displayEmail = session.user.email ?? "No email available";

  return (
    <WorkspaceShell title="Account & Wallet Preferences" subtitle={`${displayName} · ${displayEmail}`}>
      <section className="earth-card rounded-2xl p-4">
        <p className="earth-kicker text-xs uppercase tracking-[0.14em]">Profile Actions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ThemeToggle />
          <a
            href="/api/auth/logout"
            className="earth-secondary rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em]"
          >
            Sign out
          </a>
        </div>
      </section>

      <WalletPreferences />
    </WorkspaceShell>
  );
}
