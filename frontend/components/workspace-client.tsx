"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { type InterfaceStyle, type WorkspaceTab } from "@/lib/dashboard-data";
import {
  CREDENTIAL_STORAGE_KEY,
  DEFAULT_WRITING_STYLE_STORAGE_KEY,
  INTERFACE_STYLE_STORAGE_KEY,
  clearStoredWorkspaceAccount,
  coerceWorkspaceTabAlias,
  emptyCredentials,
  isInterfaceStyle,
  isWritingStylePresetId,
  readLocalStorage,
  readStoredWorkspaceAccount,
  saveStoredWorkspaceAccount,
  writeLocalStorage,
  type CredentialSettings,
  type WritingStylePresetId
} from "./workspace-utils";
import { PcLoginPage } from "./workspace-login";
import { DashboardView } from "./workspace-dashboard";
import { KnowledgeView } from "./workspace-knowledge";
import { ContentView } from "./workspace-content";
import { SettingsView } from "./workspace-settings";
import { CoverView, DeliveryView, ResearchView } from "./workspace-delivery";

export function WorkspaceClient({
  hasInitialTheme,
  initialProject,
  initialStyle,
  initialTab
}: {
  hasInitialTheme: boolean;
  initialProject: string | null;
  initialStyle: InterfaceStyle;
  initialTab: WorkspaceTab;
}) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [interfaceStyle, setInterfaceStyle] = useState<InterfaceStyle>(initialStyle);
  const [defaultWritingStyle, setDefaultWritingStyle] =
    useState<WritingStylePresetId>("warm_cute");
  const [showHelperText, setShowHelperText] = useState(true);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [credentials, setCredentials] = useState<CredentialSettings>(emptyCredentials);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [workspaceAccount, setWorkspaceAccount] = useState<string | null>(null);
  // 标记客户端 hydration 完成，避免 SSR 初始值与客户端 URL 解析不一致导致 hydration mismatch
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    function syncStateFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      const theme = params.get("theme");
      const normalizedTab = coerceWorkspaceTabAlias(tab);

      if (normalizedTab && tab !== normalizedTab) {
        params.set("tab", normalizedTab);
        window.history.replaceState(null, "", `/?${params.toString()}`);
        setActiveTab(normalizedTab);
      } else {
        setActiveTab(normalizedTab ?? "dashboard");
      }
      if (isInterfaceStyle(theme)) {
        setInterfaceStyle(theme);
      }
    }

    syncStateFromUrl();
    window.addEventListener("popstate", syncStateFromUrl);

    const params = new URLSearchParams(window.location.search);
    const storedStyle = readLocalStorage(INTERFACE_STYLE_STORAGE_KEY);
    if (!hasInitialTheme && !isInterfaceStyle(params.get("theme")) && isInterfaceStyle(storedStyle)) {
      setInterfaceStyle(storedStyle);
    }
    const storedWritingStyle = readLocalStorage(DEFAULT_WRITING_STYLE_STORAGE_KEY);
    if (isWritingStylePresetId(storedWritingStyle)) {
      setDefaultWritingStyle(storedWritingStyle);
    }

    try {
      const stored = readLocalStorage(CREDENTIAL_STORAGE_KEY);
      if (stored) {
        setCredentials({ ...emptyCredentials, ...JSON.parse(stored) });
      }
    } catch (_error) {
      setCredentials(emptyCredentials);
    } finally {
      setCredentialsLoaded(true);
    }
    setWorkspaceAccount(readStoredWorkspaceAccount());
    setAuthLoaded(true);

    return () => window.removeEventListener("popstate", syncStateFromUrl);
  }, [hasInitialTheme]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (hasInitialTheme) {
      setInterfaceStyle(initialStyle);
    }
  }, [hasInitialTheme, initialStyle]);

  useEffect(() => {
    if (!credentialsLoaded) {
      return;
    }
    writeLocalStorage(CREDENTIAL_STORAGE_KEY, JSON.stringify(credentials));
  }, [credentials, credentialsLoaded]);

  useEffect(() => {
    writeLocalStorage(INTERFACE_STYLE_STORAGE_KEY, interfaceStyle);
  }, [interfaceStyle]);

  useEffect(() => {
    writeLocalStorage(DEFAULT_WRITING_STYLE_STORAGE_KEY, defaultWritingStyle);
  }, [defaultWritingStyle]);

  function buildWorkspaceUrl(tab: WorkspaceTab, style = interfaceStyle) {
    const params = new URLSearchParams();
    if (tab !== "dashboard") {
      params.set("tab", tab);
    }
    params.set("theme", style);
    const query = params.toString();
    return query ? `/?${query}` : "/";
  }

  function handleTabChange(nextTab: WorkspaceTab) {
    setActiveTab(nextTab);
    const nextUrl = buildWorkspaceUrl(nextTab);
    if (window.location.pathname + window.location.search !== nextUrl) {
      window.history.pushState(null, "", nextUrl);
    }
  }

  function handleLogin(account: string) {
    saveStoredWorkspaceAccount(account);
    setWorkspaceAccount(account);
  }

  function handleLogout() {
    clearStoredWorkspaceAccount();
    setWorkspaceAccount(null);
  }

  if (!authLoaded || !workspaceAccount) {
    return (
      <PcLoginPage
        interfaceStyle={interfaceStyle}
        loading={!authLoaded}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div suppressHydrationWarning>
    <AppShell
      activeTab={activeTab}
      accountLabel={workspaceAccount}
      interfaceStyle={interfaceStyle}
      onLogout={handleLogout}
      showHelperText={showHelperText}
    >
      {activeTab === "dashboard" ? (
        <DashboardView
          buildWorkspaceUrl={buildWorkspaceUrl}
          defaultWritingStyle={defaultWritingStyle}
          onDefaultWritingStyleChange={setDefaultWritingStyle}
        />
      ) : null}
      {activeTab === "research" ? (
        <ResearchView
          onOpenSettings={() => handleTabChange("settings")}
          workspaceToken={credentials.workspaceToken}
        />
      ) : null}
      {activeTab === "knowledge" ? <KnowledgeView /> : null}
      {activeTab === "content" ? (
        <ContentView
          defaultWritingStyle={defaultWritingStyle}
          interfaceStyle={interfaceStyle}
          initialProject={initialProject}
          onOpenSettings={() => handleTabChange("settings")}
          workspaceToken={credentials.workspaceToken}
        />
      ) : null}
      {activeTab === "cover" ? <CoverView contentHref={buildWorkspaceUrl("content")} /> : null}
      {activeTab === "delivery" ? <DeliveryView /> : null}
      {activeTab === "settings" ? (
        <SettingsView
          credentials={credentials}
          interfaceStyle={interfaceStyle}
          onCredentialsChange={setCredentials}
          onReset={() => setShowHelperText(true)}
          onShowHelperTextChange={setShowHelperText}
          showHelperText={showHelperText}
        />
      ) : null}
    </AppShell>
    </div>
  );
}
