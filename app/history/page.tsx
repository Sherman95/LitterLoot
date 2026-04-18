import { getSession } from "@auth0/nextjs-auth0";
import { redirect } from "next/navigation";
import HistoryList from "@/components/history/HistoryList";
import WorkspaceShell from "@/components/layout/WorkspaceShell";

export default async function HistoryPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/api/auth/login?returnTo=/history");
  }

  return (
    <WorkspaceShell
      title="Verification History"
      subtitle="Dedicated record area separated from dashboard mission flow."
    >
      <HistoryList />
    </WorkspaceShell>
  );
}
