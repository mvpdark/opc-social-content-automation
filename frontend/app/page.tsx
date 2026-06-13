import { WorkspaceClient } from "@/components/workspace-client";
import {
  interfaceStyles,
  workspaceTabIds,
  type InterfaceStyle,
  type WorkspaceTab
} from "@/lib/dashboard-data";

function coerceWorkspaceTab(value: string | string[] | undefined): WorkspaceTab {
  const tab = Array.isArray(value) ? value[0] : value;
  if (tab === "review") {
    return "content";
  }
  if (tab === "publish" || tab === "publishing") {
    return "delivery";
  }
  return workspaceTabIds.includes(tab as WorkspaceTab) ? (tab as WorkspaceTab) : "dashboard";
}

function coerceInterfaceStyle(value: string | string[] | undefined): InterfaceStyle {
  const style = Array.isArray(value) ? value[0] : value;
  return interfaceStyles.some((item) => item.id === style) ? (style as InterfaceStyle) : "apple";
}

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{
    project?: string | string[];
    tab?: string | string[];
    theme?: string | string[];
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const project = Array.isArray(params.project) ? params.project[0] : params.project ?? null;
  return (
    <WorkspaceClient
      hasInitialTheme={params.theme !== undefined}
      initialProject={project}
      initialStyle={coerceInterfaceStyle(params.theme)}
      initialTab={coerceWorkspaceTab(params.tab)}
    />
  );
}
