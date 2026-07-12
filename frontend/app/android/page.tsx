"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type TouchEvent
} from "react";

import { CollectScreen } from "@/components/mobile-collect-screen";
import { CreateScreen } from "@/components/mobile-create-screen";
import { KnowledgeScreen } from "@/components/mobile-knowledge-screen";
import { ReviewScreen, fetchMobileReviewContents } from "@/components/mobile-review-screen";
import { SettingsScreen } from "@/components/mobile-settings-screen";
import { HomeScreen } from "@/components/mobile-home-screen";
import { LoginScreen } from "@/components/mobile-login-screen";
import { MobileHeader, BottomNav } from "@/components/mobile-shell-chrome";
import { ViewErrorBoundary } from "@/components/error-boundary";
import { getApiBase } from "@/lib/api-base";
import {
  requestMobileNestedBack,
  type MobileBackRequestSource
} from "@/lib/mobile-back-navigation";
import { useMobileBackGesture } from "@/lib/use-mobile-back-gesture";
import {
  type ProviderStatusItem
} from "@/lib/provider-settings";
import {
  CREDENTIAL_STORAGE_KEY,
  MOBILE_AUTH_STORAGE_KEY,
  emptyCredentials,
  readMobileStorage,
  removeMobileStorage,
  writeMobileStorage,
  type CredentialSettings,
  type MobileTab
} from "@/lib/mobile-runtime";
import { fetchProviderStatuses } from "@/components/workspace-utils";

type MobileHistoryState = {
  opcMobileTab?: MobileTab;
};

declare global {
  interface Window {
    OMPCMobileBack?: () => boolean;
  }
}


const API_BASE = getApiBase();
const MOBILE_PAPER_TEXTURE = "/mobile-assets/paper-texture.png";
const MOBILE_COLLECTION_COLLAGE = "/mobile-assets/collection-collage.png";
const MOBILE_CREATE_CARD_BG = "/mobile-assets/create-card-bg.png";
const mobileScreenArt: Record<MobileTab, { image: string; opacity: string; position: string }> = {
  home: {
    image: MOBILE_COLLECTION_COLLAGE,
    opacity: "opacity-80",
    position: "center top"
  },
  collect: {
    image: MOBILE_COLLECTION_COLLAGE,
    opacity: "opacity-78",
    position: "center top"
  },
  create: {
    image: MOBILE_CREATE_CARD_BG,
    opacity: "opacity-92",
    position: "center top"
  },
  knowledge: {
    image: MOBILE_COLLECTION_COLLAGE,
    opacity: "opacity-72",
    position: "center top"
  },
  review: {
    image: MOBILE_CREATE_CARD_BG,
    opacity: "opacity-86",
    position: "center top"
  },
  settings: {
    image: MOBILE_COLLECTION_COLLAGE,
    opacity: "opacity-58",
    position: "center top"
  }
};

const taskActionCopy: Record<MobileTab, string> = {
  home: "已回到首页。",
  collect: "已打开采集页，可以切换平台、编辑关键词和保存知识摘要。",
  knowledge: "已打开知识库，可以查看最近入库内容或搜索知识条目。",
  review: "已打开人工确认台，可以核对草稿、封面和来源后通过或退回。",
  create: "已打开创作项目页，先选择项目再进入生成入口。",
  settings: "已打开设置页，可以查看账号状态和发布确认规则。"
};

function isMobileTab(value: unknown): value is MobileTab {
  return (
    value === "home" ||
    value === "collect" ||
    value === "knowledge" ||
    value === "review" ||
    value === "create" ||
    value === "settings"
  );
}

function buildMobileTabUrl(tab: MobileTab) {
  const url = new URL(window.location.href);
  url.searchParams.set("tab", tab);
  return `${url.pathname}${url.search}${url.hash}`;
}


function detectNativeShell() {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("shell") === "android" ||
    params.get("app") === "ompc" ||
    window.navigator.userAgent.includes("OMPCWorkstation")
  );
}

function readStoredMobileAccount() {
  const stored = readMobileStorage(MOBILE_AUTH_STORAGE_KEY);
  const account = stored?.trim() ?? "";
  return account.length > 0 && account.length <= 32 ? account : null;
}

function saveStoredMobileAccount(account: string) {
  writeMobileStorage(MOBILE_AUTH_STORAGE_KEY, account);
}

function clearStoredMobileAccount() {
  removeMobileStorage(MOBILE_AUTH_STORAGE_KEY);
}

export default function AndroidPreviewPage() {
  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const [isNativeShell, setIsNativeShell] = useState(false);
  const [status, setStatus] = useState("手机端操作已就绪");
  const [credentials, setCredentials] = useState<CredentialSettings>(emptyCredentials);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [mobileAccount, setMobileAccount] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatusItem[]>([]);
  const [reviewPendingCount, setReviewPendingCount] = useState(0);
  const activeTabRef = useRef<MobileTab>("home");
  const mobileTabStackRef = useRef<MobileTab[]>(["home"]);
  const mobileHistoryDepthRef = useRef(1);
  const mobileHistoryReadyRef = useRef(false);
  const skipNextHistoryPushRef = useRef(false);

  useEffect(() => {
    setIsNativeShell(detectNativeShell());
    setMobileAccount(readStoredMobileAccount());
    setAuthLoaded(true);
  }, []);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === "undefined" || !authLoaded || !mobileAccount) {
      return undefined;
    }

    const initialTabParam = new URLSearchParams(window.location.search).get("tab");
    const initialTab = isMobileTab(initialTabParam) ? initialTabParam : activeTabRef.current;

    if (initialTab !== activeTabRef.current) {
      skipNextHistoryPushRef.current = true;
      setActiveTab(initialTab);
    }

    window.history.replaceState(
      { ...(window.history.state ?? {}), opcMobileTab: initialTab } satisfies MobileHistoryState,
      "",
      buildMobileTabUrl(initialTab)
    );
    mobileTabStackRef.current = [initialTab];
    mobileHistoryDepthRef.current = 1;
    mobileHistoryReadyRef.current = true;

    function handlePopState(event: PopStateEvent) {
      const nextTab = (event.state as MobileHistoryState | null)?.opcMobileTab;
      if (!isMobileTab(nextTab)) {
        return;
      }
      const stack = mobileTabStackRef.current;
      if (stack.length > 1 && stack[stack.length - 2] === nextTab) {
        stack.pop();
      } else if (stack[stack.length - 1] !== nextTab) {
        stack.push(nextTab);
      }
      mobileHistoryDepthRef.current = mobileTabStackRef.current.length;
      skipNextHistoryPushRef.current = true;
      setActiveTab(nextTab);
      setStatus(nextTab === "home" ? "已按返回手势回到首页。" : taskActionCopy[nextTab]);
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      mobileHistoryReadyRef.current = false;
    };
  }, [authLoaded, mobileAccount]);

  useEffect(() => {
    if (typeof window === "undefined" || !authLoaded || !mobileAccount || !mobileHistoryReadyRef.current) {
      return;
    }
    if (skipNextHistoryPushRef.current) {
      skipNextHistoryPushRef.current = false;
      return;
    }

    const currentState = window.history.state as MobileHistoryState | null;
    if (currentState?.opcMobileTab === activeTab) {
      return;
    }

    window.history.pushState(
      { ...(window.history.state ?? {}), opcMobileTab: activeTab } satisfies MobileHistoryState,
      "",
      buildMobileTabUrl(activeTab)
    );
    const stack = mobileTabStackRef.current;
    if (stack[stack.length - 1] !== activeTab) {
      stack.push(activeTab);
    }
    mobileHistoryDepthRef.current = stack.length;
  }, [activeTab, authLoaded, mobileAccount]);

  useEffect(() => {
    try {
      const stored = readMobileStorage(CREDENTIAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, unknown>;
        const safeKeys = ["workspaceToken", "draftApiKey", "imageApiKey", "rewriteApiKey"] as const;
        const filtered: Partial<typeof emptyCredentials> = {};
        for (const key of safeKeys) {
          if (typeof parsed[key] === "string") {
            filtered[key] = parsed[key] as string;
          }
        }
        setCredentials({ ...emptyCredentials, ...filtered });
      }
    } catch (_error) {
      setCredentials(emptyCredentials);
    } finally {
      setCredentialsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!credentialsLoaded) {
      return;
    }
    writeMobileStorage(CREDENTIAL_STORAGE_KEY, JSON.stringify(credentials));
  }, [credentials, credentialsLoaded]);

  useEffect(() => {
    if (!mobileAccount) {
      setProviderStatuses([]);
      return;
    }

    let active = true;

    async function loadProviderStatuses() {
      try {
        const data = await fetchProviderStatuses(credentials.workspaceToken);
        if (active) {
          setProviderStatuses(data);
        }
      } catch (_error) {
        if (active) {
          setStatus("应用服务状态暂时读取失败，生成时会继续尝试连接。");
        }
      }
    }

    void loadProviderStatuses();
    return () => {
      active = false;
    };
  }, [mobileAccount, credentials.workspaceToken]);

  useEffect(() => {
    if (!mobileAccount || !credentialsLoaded) {
      return undefined;
    }

    let active = true;

    async function loadReviewPendingCount() {
      try {
        const contents = await fetchMobileReviewContents(credentials);
        if (active) {
          setReviewPendingCount(contents.length);
        }
      } catch (_error) {
        if (active) {
          setReviewPendingCount(0);
        }
      }
    }

    void loadReviewPendingCount();
    return () => {
      active = false;
    };
  }, [activeTab, credentials.workspaceToken, credentialsLoaded, mobileAccount]);

  const openTab = useCallback((tab: MobileTab, message = taskActionCopy[tab]) => {
    if (activeTabRef.current === tab) {
      setStatus(message);
      return;
    }
    setActiveTab(tab);
    setStatus(message);
  }, []);

  const replaceMobileTab = useCallback((tab: MobileTab, message: string, options: { resetStack?: boolean } = {}) => {
    if (typeof window !== "undefined" && mobileHistoryReadyRef.current) {
      window.history.replaceState(
        { ...(window.history.state ?? {}), opcMobileTab: tab } satisfies MobileHistoryState,
        "",
        buildMobileTabUrl(tab)
      );
      skipNextHistoryPushRef.current = true;
    }
    if (options.resetStack ?? true) {
      mobileTabStackRef.current = [tab];
    }
    mobileHistoryDepthRef.current = mobileTabStackRef.current.length;
    setActiveTab(tab);
    setStatus(message);
  }, []);

  const handleMobileBackRequest = useCallback((source: MobileBackRequestSource) => {
    if (!authLoaded || !mobileAccount) {
      return false;
    }

    if (requestMobileNestedBack(source)) {
      setStatus("已返回上一级页面。");
      return true;
    }

    const stack = mobileTabStackRef.current;
    if (stack.length > 1) {
      stack.pop();
      const previousTab = stack[stack.length - 1] ?? "home";
      replaceMobileTab(
        previousTab,
        previousTab === "home" ? "已按返回手势回到首页。" : taskActionCopy[previousTab],
        { resetStack: false }
      );
      return true;
    }

    if (activeTabRef.current !== "home") {
      replaceMobileTab("home", "已返回首页。");
      return true;
    }

    return false;
  }, [authLoaded, mobileAccount, replaceMobileTab]);

  const backGestureHandlers = useMobileBackGesture(handleMobileBackRequest);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handler = () => handleMobileBackRequest("native");
    window.OMPCMobileBack = handler;
    return () => {
      if (window.OMPCMobileBack === handler) {
        delete window.OMPCMobileBack;
      }
    };
  }, [handleMobileBackRequest]);

  const login = useCallback((
    account: string,
    nextProviderStatuses: ProviderStatusItem[],
    defaultKeysBound: boolean,
    accessToken: string
  ) => {
    saveStoredMobileAccount(account);
    setMobileAccount(account);
    setProviderStatuses(nextProviderStatuses);
    if (accessToken) {
      setCredentials(prev => {
        const next = { ...prev, workspaceToken: accessToken };
        writeMobileStorage(CREDENTIAL_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
    mobileTabStackRef.current = ["home"];
    mobileHistoryDepthRef.current = 1;
    setActiveTab("home");
    setStatus(defaultKeysBound ? `已登录：${account}，默认服务授权已就绪。` : `已登录：${account}，请在电脑端检查服务授权。`);
  }, []);

  const logout = useCallback(() => {
    clearStoredMobileAccount();
    setMobileAccount(null);
    setCredentials(prev => {
      const next = { ...prev, workspaceToken: "" };
      writeMobileStorage(CREDENTIAL_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    removeMobileStorage("opc_mobile_last_generated_content_v1");
    removeMobileStorage("opc_mobile_last_generated_cover_v1");
    removeMobileStorage("opc_mobile_draft_history_v1");
    removeMobileStorage("opc_mobile_deleted_draft_ids_v1");
    removeMobileStorage("opc_mobile_draft_preview_v1");
    mobileTabStackRef.current = ["home"];
    mobileHistoryDepthRef.current = 1;
    setActiveTab("home");
    setStatus("已退出登录。");
  }, []);

  const handleNotify = useCallback(
    () => setStatus("暂无新通知，发布前确认和安全规则仍保持开启。"),
    []
  );

  const handleOpenCreate = useCallback(
    () => openTab("create", "已打开创作项目页，可以继续修改退回草稿。"),
    [openTab]
  );

  const screenContent = useMemo(() => (
    <>
      <MobileHeader
        activeTab={activeTab}
        isNativeShell={isNativeShell}
        onNotify={handleNotify}
      />
      <section className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-3">
        <ViewErrorBoundary>
        <MobileScreenBackdrop activeTab={activeTab} />
        <MobileStatusBar activeTab={activeTab} />
        <div className="relative z-10" hidden={activeTab !== "home"}>
          <HomeScreen
            onAction={setStatus}
            onChangeTab={openTab}
            reviewPendingCount={reviewPendingCount}
          />
        </div>
        <div className="relative z-10" hidden={activeTab !== "collect"}>
          <CollectScreen active={activeTab === "collect"} credentials={credentials} onAction={setStatus} />
        </div>
        <div className="relative z-10" hidden={activeTab !== "knowledge"}>
          <KnowledgeScreen active={activeTab === "knowledge"} onAction={setStatus} />
        </div>
        {activeTab === "review" ? (
          <div className="relative z-10">
            <ReviewScreen
              active={activeTab === "review"}
              credentials={credentials}
              onAction={setStatus}
              onOpenCreate={handleOpenCreate}
              onPendingCountChange={setReviewPendingCount}
            />
          </div>
        ) : null}
        <div className="relative z-10" hidden={activeTab !== "create"}>
          <CreateScreen active={activeTab === "create"} apiBase={API_BASE} credentials={credentials} onAction={setStatus} />
        </div>
        <div className="relative z-10" hidden={activeTab !== "settings"}>
          <SettingsScreen
            mobileAccount={mobileAccount!}
            onAction={setStatus}
            onLogout={logout}
            providerStatuses={providerStatuses}
          />
        </div>
        </ViewErrorBoundary>
      </section>
      <BottomNav activeTab={activeTab} onChange={openTab} />
    </>
  ), [activeTab, credentials, reviewPendingCount, providerStatuses, mobileAccount, isNativeShell, openTab, handleNotify, handleOpenCreate, logout]);

  if (!authLoaded || !mobileAccount) {
    return (
      <MobileShell>
        <LoginScreen
          isNativeShell={isNativeShell}
          loading={!authLoaded}
          onLogin={login}
        />
      </MobileShell>
    );
  }

  return (
    <MobileStatusContext.Provider value={status}>
      <MobileShell {...backGestureHandlers}>
        {screenContent}
      </MobileShell>
    </MobileStatusContext.Provider>
  );
}

const MobileShell = memo(function MobileShell({
  children,
  onBackGestureCancel,
  onBackGestureEnd,
  onBackGestureStart,
  onBackPointerCancel,
  onBackPointerEnd,
  onBackPointerStart
}: {
  children: ReactNode;
  onBackGestureCancel?: () => void;
  onBackGestureEnd?: (event: TouchEvent<HTMLDivElement>) => void;
  onBackGestureStart?: (event: TouchEvent<HTMLDivElement>) => void;
  onBackPointerCancel?: () => void;
  onBackPointerEnd?: (event: PointerEvent<HTMLDivElement>) => void;
  onBackPointerStart?: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <main className="opc-mobile-shell min-h-[100dvh] bg-shell px-0 py-0 text-ink sm:px-6 sm:py-6">
      <div
        className="relative mx-auto h-[100dvh] max-w-[430px] overflow-hidden bg-cream bg-cover shadow-[0_24px_70px_rgba(20,48,41,0.18)] sm:h-[calc(100dvh-48px)] sm:min-h-[680px] sm:rounded-[30px] sm:border sm:border-white/[0.80]"
        onPointerCancel={onBackPointerCancel}
        onPointerDown={onBackPointerStart}
        onPointerUp={onBackPointerEnd}
        onTouchCancel={onBackGestureCancel}
        onTouchEnd={onBackGestureEnd}
        onTouchStart={onBackGestureStart}
        style={{ backgroundImage: `url(${MOBILE_PAPER_TEXTURE})` }}
      >
        <div className="flex h-full flex-col">{children}</div>
      </div>
    </main>
  );
});

const MobileStatusContext = createContext<string>("");

const MobileStatusBar = memo(function MobileStatusBar({ activeTab }: { activeTab: MobileTab }) {
  const status = useContext(MobileStatusContext);
  return (
    <div
      aria-live="polite"
      className={[
        "relative z-10 mb-2 ml-1 max-w-[calc(100%-0.5rem)] rounded-full border border-white/[0.82] bg-[rgba(255,253,247,0.78)] px-3 py-1.5 text-[11px] font-semibold leading-5 text-ink/[0.70] shadow-[0_10px_24px_rgba(27,58,48,0.06),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-md",
        activeTab === "collect" ? "sr-only" : "inline-flex"
      ].join(" ")}
      data-testid="mobile-status"
      role="status"
    >
      {status}
    </div>
  );
});

const MobileScreenBackdrop = memo(function MobileScreenBackdrop({ activeTab }: { activeTab: MobileTab }) {
  const art = mobileScreenArt[activeTab];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[330px] overflow-hidden">
      <div
        className={`absolute inset-x-[-16%] top-[-42px] h-[280px] bg-cover ${art.opacity}`}
        style={{
          backgroundImage: `url(${art.image})`,
          backgroundPosition: art.position
        }}
      />
      <div className="absolute inset-x-0 top-0 h-[330px] bg-[linear-gradient(180deg,rgba(248,245,236,0.08)_0%,rgba(248,245,236,0.34)_38%,rgba(248,245,236,0.84)_74%,rgba(248,245,236,0.98)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-[190px] bg-[radial-gradient(circle_at_78%_8%,rgba(255,255,255,0.58),transparent_36%),radial-gradient(circle_at_12%_20%,rgba(231,242,234,0.34),transparent_42%)]" />
    </div>
  );
});
