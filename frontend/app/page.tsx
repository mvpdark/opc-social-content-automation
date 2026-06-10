import { WorkspaceClient } from "@/components/workspace-client";
import type { WorkspaceTab } from "@/lib/dashboard-data";

const workspaceTabIds: WorkspaceTab[] = [
  "dashboard",
  "research",
  "knowledge",
  "content",
  "review",
  "cover",
  "delivery",
  "settings"
];

function coerceWorkspaceTab(value: string | string[] | undefined): WorkspaceTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return workspaceTabIds.includes(tab as WorkspaceTab) ? (tab as WorkspaceTab) : "dashboard";
}

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{ tab?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  return <WorkspaceClient initialTab={coerceWorkspaceTab(params.tab)} />;
}
