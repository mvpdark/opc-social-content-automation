import { WorkspaceClient } from "@/components/workspace-client";
import { interfaceStyles, type InterfaceStyle, type WorkspaceTab } from "@/lib/dashboard-data";

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

function coerceInterfaceStyle(value: string | string[] | undefined): InterfaceStyle {
  const style = Array.isArray(value) ? value[0] : value;
  return interfaceStyles.some((item) => item.id === style) ? (style as InterfaceStyle) : "apple";
}

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{ tab?: string | string[]; theme?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  return (
    <WorkspaceClient
      hasInitialTheme={params.theme !== undefined}
      initialStyle={coerceInterfaceStyle(params.theme)}
      initialTab={coerceWorkspaceTab(params.tab)}
    />
  );
}
