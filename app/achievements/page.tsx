import { getSession } from "@auth0/nextjs-auth0";
import { redirect } from "next/navigation";
import WorkspaceShell from "@/components/layout/WorkspaceShell";
import AchievementsBoard from "@/components/achievements/AchievementsBoard";

export default async function AchievementsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/api/auth/login?returnTo=/achievements");
  }

  return (
    <WorkspaceShell
      title="Achievements & Missions"
      subtitle="Track mission milestones and claim extra SOL rewards here."
    >
      <section className="earth-card rounded-2xl p-4">
        <p className="earth-kicker text-xs font-semibold uppercase tracking-[0.14em]">Mission Area</p>
        <h2 className="mt-1 text-lg font-bold">All mission progress lives here</h2>
        <p className="earth-muted mt-1 text-sm">
          Dashboard now stays minimal. Mission milestones, long-term goals, and bonus claims are managed in this section.
        </p>
      </section>

      <AchievementsBoard />
    </WorkspaceShell>
  );
}