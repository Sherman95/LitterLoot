import { getSession } from "@auth0/nextjs-auth0";
import { redirect } from "next/navigation";
import CameraUploader from "@/components/CameraUploader";
import LiveZoneMap from "@/components/LiveZoneMap";
import WorkspaceShell from "@/components/layout/WorkspaceShell";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/api/auth/login?returnTo=/dashboard");
  }

  const displayName = session.user.given_name ?? session.user.name ?? session.user.nickname ?? "Cleaner";

  return (
    <WorkspaceShell
      title="Dashboard"
      subtitle={`Welcome, ${displayName}. Keep it simple: locate, upload, verify.`}
    >
      <section className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <LiveZoneMap />
        </div>
        <div className="xl:col-span-3">
          <CameraUploader userKey={session.user.sub ?? session.user.email ?? "anonymous"} />
        </div>
      </section>
    </WorkspaceShell>
  );
}
