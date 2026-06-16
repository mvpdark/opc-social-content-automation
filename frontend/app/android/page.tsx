"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
  type ReactNode,
  type TouchEvent
} from "react";
import {
  ArrowLeft,
  Bell,
  BookOpenText,
  ChevronRight,
  Database,
  Home,
  LockKeyhole,
  Loader2,
  PenLine,
  Radar,
  Settings,
  ShieldCheck,
  UserRound
} from "lucide-react";

import { CollectScreen } from "@/components/mobile-collect-screen";
import { CreateScreen } from "@/components/mobile-create-screen";
import { KnowledgeScreen } from "@/components/mobile-knowledge-screen";
import { ReviewScreen, fetchMobileReviewContents } from "@/components/mobile-review-screen";
import { SettingsScreen } from "@/components/mobile-settings-screen";
import {
  Metric,
  MobilePanel,
  StepTile,
  TaskRow
} from "@/components/mobile-ui";
import { getApiBase } from "@/lib/api-base";
import {
  requestMobileNestedBack,
  type MobileBackRequestSource
} from "@/lib/mobile-back-navigation";
import {
  sanitizeProviderStatusItems,
  type ProviderStatusItem
} from "@/lib/provider-settings";
import { SERVICE_CONFIG_READ_ERROR } from "@/lib/service-error-copy";
import {
  CREDENTIAL_STORAGE_KEY,
  MOBILE_AUTH_STORAGE_KEY,
  emptyCredentials,
  readApiError,
  readMobileStorage,
  removeMobileStorage,
  writeMobileStorage,
  type CredentialSettings
} from "@/lib/mobile-runtime";

type MobileTab = "home" | "collect" | "knowledge" | "review" | "create" | "settings";
type MobileHistoryState = {
  opcMobileTab?: MobileTab;
};

type MobileBackGestureStart = {
  edge: "left" | "right";
  ignored: boolean;
  pointerId?: number;
  x: number;
  y: number;
};

declare global {
  interface Window {
    OMPCMobileBack?: () => boolean;
  }
}

type MobileLoginResponse = {
  account: string;
  default_keys_bound: boolean;
  key_profile: string;
  provider_statuses: ProviderStatusItem[];
};

async function fetchProviderStatuses() {
  const response = await fetch(`${API_BASE}/workspace/provider-status`);
  if (!response.ok) {
    throw new Error(await readApiError(response, SERVICE_CONFIG_READ_ERROR));
  }
  return sanitizeProviderStatusItems(
    (await response.json()) as ProviderStatusItem[]
  );
}

async function authenticateMobileLogin(account: string, password: string) {
  try {
    const response = await fetch(`${API_BASE}/auth/mobile-login`, {
      body: JSON.stringify({ account, password }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    if (response.ok) {
      const data = (await response.json()) as Partial<MobileLoginResponse>;
      if (!data.account?.trim()) {
        throw new Error("登录服务响应异常，请稍后再试。");
      }
      return {
        account: data.account.trim(),
        defaultKeysBound: Boolean(data.default_keys_bound),
        providerStatuses: Array.isArray(data.provider_statuses)
          ? sanitizeProviderStatusItems(data.provider_statuses)
          : []
      };
    }
    if (response.status === 404 || response.status === 405) {
      throw new Error("登录服务暂未更新，请重新打开应用后再试。");
    }
    if (response.status >= 500) {
      throw new Error(await readApiError(response, "登录服务暂时不可用，请稍后再试。"));
    }
    throw new Error("账号或密码不正确。");
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("登录服务暂时不可用，请确认应用服务已启动。");
    }
    throw error;
  }
}

const API_BASE = getApiBase();
const MOBILE_PAPER_TEXTURE = "/mobile-assets/paper-texture.png";
const MOBILE_COLLECTION_COLLAGE = "/mobile-assets/collection-collage.png";
const MOBILE_CREATE_CARD_BG = "/mobile-assets/create-card-bg.png";
const MOBILE_BACK_GESTURE_EDGE_WIDTH = 64;
const MOBILE_BACK_GESTURE_MIN_DISTANCE = 72;
const MOBILE_BACK_GESTURE_MAX_VERTICAL = 96;
const MOBILE_BACK_GESTURE_DIRECTION_RATIO = 1.25;
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
const MOBILE_HEADER_ICON_BUTTON_CLASS =
  "flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-[20px] border border-white/[0.82] bg-[rgba(255,253,247,0.76)] text-ink shadow-[0_10px_24px_rgba(28,54,45,0.08),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-md active:scale-[0.98]";

const bottomTabs: Array<{ id: MobileTab; icon: typeof Home; label: string }> = [
  { id: "home", icon: Home, label: "首页" },
  { id: "collect", icon: Radar, label: "采集" },
  { id: "knowledge", icon: BookOpenText, label: "知识" },
  { id: "create", icon: PenLine, label: "创作" },
  { id: "settings", icon: Settings, label: "设置" }
];

const workItems = [
  { label: "补公开图文素材", state: "进入采集", icon: Radar, tab: "collect" },
  { label: "查看知识库", state: "进入知识", icon: BookOpenText, tab: "knowledge" },
  { label: "生成硕升博草稿", state: "进入创作", icon: PenLine, tab: "create" },
  { label: "确认待发布草稿", state: "进入确认", icon: ShieldCheck, tab: "review" }
] satisfies Array<{
  icon: typeof Radar;
  label: string;
  state: string;
  tab: MobileTab;
}>;

const progressSteps = [
  { label: "采集", state: "当前", icon: Database, tab: "collect" },
  { label: "知识库", state: "可查看", icon: BookOpenText, tab: "knowledge" },
  { label: "确认", state: "待处理", icon: ShieldCheck, tab: "review" }
] satisfies Array<{
  icon: typeof Database;
  label: string;
  state: string;
  tab: MobileTab;
}>;

const quickMetrics = [
  { label: "趋势素材", value: "待采集", tone: "blue", tab: "collect" },
  { label: "知识条目", value: "待检索", tone: "green", tab: "knowledge" },
  { label: "待确认", value: "0", tone: "coral", tab: "review" }
] satisfies Array<{
  label: string;
  tab: MobileTab;
  tone: "blue" | "coral" | "green";
  value: string;
}>;

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

function getPcReturnHref() {
  if (typeof window === "undefined") {
    return "/";
  }
  const from = new URLSearchParams(window.location.search).get("from");
  if (from && from.startsWith("/") && !from.startsWith("//")) {
    return from;
  }
  return "/";
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
  const mobileBackGestureStartRef = useRef<MobileBackGestureStart | null>(null);
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
        setCredentials({ ...emptyCredentials, ...JSON.parse(stored) });
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
        const data = await fetchProviderStatuses();
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
  }, [mobileAccount]);

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

  function openTab(tab: MobileTab, message = taskActionCopy[tab]) {
    if (activeTabRef.current === tab) {
      setStatus(message);
      return;
    }
    setActiveTab(tab);
    setStatus(message);
  }

  function replaceMobileTab(tab: MobileTab, message: string, options: { resetStack?: boolean } = {}) {
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
  }

  function handleMobileBackRequest(source: MobileBackRequestSource) {
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
  }

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
  });

  function shouldIgnoreMobileBackGesture(target: EventTarget | null) {
    if (!(target instanceof Element)) {
      return false;
    }
    return Boolean(
      target.closest(
        'button, input, textarea, select, a, [contenteditable="true"], [data-mobile-back-swipe-ignore="true"], [data-project-swipe-ignore="true"]'
      )
    );
  }

  function beginMobileBackGesture({
    clientX,
    clientY,
    pointerId,
    target
  }: {
    clientX: number;
    clientY: number;
    pointerId?: number;
    target: EventTarget | null;
  }) {
    if (typeof window === "undefined") {
      return;
    }

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const isLeftEdge = clientX <= MOBILE_BACK_GESTURE_EDGE_WIDTH;
    const isRightEdge = clientX >= viewportWidth - MOBILE_BACK_GESTURE_EDGE_WIDTH;
    if (!isLeftEdge && !isRightEdge) {
      mobileBackGestureStartRef.current = null;
      return;
    }

    mobileBackGestureStartRef.current = {
      edge: isLeftEdge ? "left" : "right",
      ignored: shouldIgnoreMobileBackGesture(target),
      pointerId,
      x: clientX,
      y: clientY
    };
  }

  function clearMobileBackGesture() {
    mobileBackGestureStartRef.current = null;
  }

  function finishMobileBackGesture({
    clientX,
    clientY,
    preventDefault,
    stopPropagation
  }: {
    clientX: number;
    clientY: number;
    preventDefault: () => void;
    stopPropagation: () => void;
  }) {
    const start = mobileBackGestureStartRef.current;
    mobileBackGestureStartRef.current = null;
    if (!start || start.ignored) {
      return;
    }

    const deltaX = clientX - start.x;
    const deltaY = clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const isLeftBackSwipe = start.edge === "left" && deltaX >= MOBILE_BACK_GESTURE_MIN_DISTANCE;
    const isRightBackSwipe = start.edge === "right" && deltaX <= -MOBILE_BACK_GESTURE_MIN_DISTANCE;

    if (
      (isLeftBackSwipe || isRightBackSwipe) &&
      absY <= MOBILE_BACK_GESTURE_MAX_VERTICAL &&
      absX > absY * MOBILE_BACK_GESTURE_DIRECTION_RATIO
    ) {
      preventDefault();
      stopPropagation();
      handleMobileBackRequest("gesture");
    }
  }

  function handleMobileBackTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    beginMobileBackGesture({
      clientX: touch.clientX,
      clientY: touch.clientY,
      target: event.target
    });
  }

  function handleMobileBackTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }
    finishMobileBackGesture({
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => event.preventDefault(),
      stopPropagation: () => event.stopPropagation()
    });
  }

  function handleMobileBackPointerStart(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    beginMobileBackGesture({
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      target: event.target
    });
  }

  function handleMobileBackPointerEnd(event: PointerEvent<HTMLDivElement>) {
    const start = mobileBackGestureStartRef.current;
    if (start?.pointerId !== undefined && start.pointerId !== event.pointerId) {
      return;
    }
    finishMobileBackGesture({
      clientX: event.clientX,
      clientY: event.clientY,
      preventDefault: () => event.preventDefault(),
      stopPropagation: () => event.stopPropagation()
    });
  }

  function login(
    account: string,
    nextProviderStatuses: ProviderStatusItem[],
    defaultKeysBound: boolean
  ) {
    saveStoredMobileAccount(account);
    setMobileAccount(account);
    setProviderStatuses(nextProviderStatuses);
    mobileTabStackRef.current = ["home"];
    mobileHistoryDepthRef.current = 1;
    setActiveTab("home");
    setStatus(defaultKeysBound ? `已登录：${account}，默认服务授权已就绪。` : `已登录：${account}，请在电脑端检查服务授权。`);
  }

  function logout() {
    clearStoredMobileAccount();
    setMobileAccount(null);
    mobileTabStackRef.current = ["home"];
    mobileHistoryDepthRef.current = 1;
    setActiveTab("home");
    setStatus("已退出登录。");
  }

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
    <MobileShell
      onBackGestureCancel={clearMobileBackGesture}
      onBackGestureEnd={handleMobileBackTouchEnd}
      onBackPointerCancel={clearMobileBackGesture}
      onBackPointerEnd={handleMobileBackPointerEnd}
      onBackPointerStart={handleMobileBackPointerStart}
      onBackGestureStart={handleMobileBackTouchStart}
    >
      <MobileHeader
        activeTab={activeTab}
        isNativeShell={isNativeShell}
        onNotify={() => setStatus("暂无新通知，发布前确认和安全规则仍保持开启。")}
      />
      <section className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-3">
        <MobileScreenBackdrop activeTab={activeTab} />
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
        <div className="relative z-10" hidden={activeTab !== "home"}>
          <HomeScreen
            onAction={setStatus}
            onChangeTab={openTab}
            reviewPendingCount={reviewPendingCount}
          />
        </div>
        <div className="relative z-10" hidden={activeTab !== "collect"}>
          <CollectScreen active={activeTab === "collect"} apiBase={API_BASE} credentials={credentials} onAction={setStatus} />
        </div>
        <div className="relative z-10" hidden={activeTab !== "knowledge"}>
          <KnowledgeScreen active={activeTab === "knowledge"} apiBase={API_BASE} onAction={setStatus} />
        </div>
        {activeTab === "review" ? (
          <div className="relative z-10">
            <ReviewScreen
              active={activeTab === "review"}
              credentials={credentials}
              onAction={setStatus}
              onOpenCreate={() => openTab("create", "已打开创作项目页，可以继续修改退回草稿。")}
              onPendingCountChange={setReviewPendingCount}
            />
          </div>
        ) : null}
        <div className="relative z-10" hidden={activeTab !== "create"}>
          <CreateScreen active={activeTab === "create"} apiBase={API_BASE} credentials={credentials} onAction={setStatus} />
        </div>
        <div className="relative z-10" hidden={activeTab !== "settings"}>
          <SettingsScreen
            mobileAccount={mobileAccount}
            onAction={setStatus}
            onLogout={logout}
            providerStatuses={providerStatuses}
          />
        </div>
      </section>
      <BottomNav activeTab={activeTab} onChange={openTab} />
    </MobileShell>
  );
}

function MobileShell({
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
    <main className="opc-mobile-shell min-h-[100dvh] bg-[#d8e6dc] px-0 py-0 text-ink sm:px-6 sm:py-6">
      <div
        className="relative mx-auto h-[100dvh] max-w-[430px] overflow-hidden bg-[#f8f5ec] bg-cover shadow-[0_24px_70px_rgba(20,48,41,0.18)] sm:h-[calc(100dvh-48px)] sm:min-h-[680px] sm:rounded-[30px] sm:border sm:border-white/[0.80]"
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
}

function MobileScreenBackdrop({ activeTab }: { activeTab: MobileTab }) {
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
}

function LoginScreen({
  isNativeShell,
  loading,
  onLogin
}: {
  isNativeShell: boolean;
  loading: boolean;
  onLogin: (
    account: string,
    providerStatuses: ProviderStatusItem[],
    defaultKeysBound: boolean
  ) => void;
}) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedAccount = account.trim();

    if (!normalizedAccount || !password) {
      setError("请输入账号和密码。");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const loginResult = await authenticateMobileLogin(normalizedAccount, password);
      onLogin(loginResult.account, loginResult.providerStatuses, loginResult.defaultKeysBound);
    } catch (error) {
      setError(error instanceof Error ? error.message : "账号或密码不正确。");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center px-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在检查登录状态
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col justify-center px-6 pb-[calc(26px+env(safe-area-inset-bottom))] pt-3">
      <div className="mb-9">
        <img
          alt=""
          className="h-14 w-14 rounded-[18px] object-cover shadow-[0_18px_36px_rgba(24,64,52,0.18)]"
          src="/app-icon.png"
        />
        <div className="mt-6 text-xs font-black text-moss">{isNativeShell ? "OMPC工作站" : "OPC Mobile"}</div>
        <h1 className="mt-1 text-[34px] font-black leading-10 tracking-normal text-ink">
          登录手机工作台
        </h1>
        <p className="mt-3 max-w-[300px] text-sm font-medium leading-6 text-muted">
          请输入分配给你的账号和密码。
        </p>
      </div>

      <form className="space-y-3" data-testid="mobile-login-form" onSubmit={submitLogin}>
        <label className="block">
          <span className="text-xs font-semibold text-muted">账号</span>
          <div className="mt-2 flex h-[52px] items-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.92)] px-4 shadow-[0_10px_26px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.88)]">
            <UserRound className="h-4 w-4 shrink-0 text-muted" />
            <input
              autoComplete="username"
              className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none"
              data-testid="mobile-login-account"
              onChange={(event) => setAccount(event.target.value)}
              placeholder="请输入账号"
              value={account}
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-muted">密码</span>
          <div className="mt-2 flex h-[52px] items-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.92)] px-4 shadow-[0_10px_26px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.88)]">
            <LockKeyhole className="h-4 w-4 shrink-0 text-muted" />
            <input
              autoComplete="current-password"
              className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none"
              data-testid="mobile-login-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
              type="password"
              value={password}
            />
          </div>
        </label>

        {error ? (
          <div
            className="rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-xs font-medium leading-5 text-ink"
            data-testid="mobile-login-error"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <button
          className="flex h-[52px] w-full touch-manipulation items-center justify-center gap-2 rounded-[18px] bg-[#161817] text-sm font-black text-white shadow-[0_16px_34px_rgba(22,24,23,0.20)] active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-login-submit"
          disabled={busy}
          type="submit"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {busy ? "登录中" : "登录"}
        </button>
      </form>
    </section>
  );
}

function MobileHeader({
  activeTab,
  isNativeShell,
  onNotify
}: {
  activeTab: MobileTab;
  isNativeShell: boolean;
  onNotify: () => void;
}) {
  const titles: Record<MobileTab, string> = {
    home: "今日工作台",
    collect: "趋势采集",
    knowledge: "知识库",
    review: "人工确认",
    create: "创作项目",
    settings: "设置"
  };
  const subtitles: Partial<Record<MobileTab, string>> = {
    collect: "自动采集优质内容，持续补给选题灵感"
  };
  const isCollect = activeTab === "collect";

  return (
    <header
      className={[
        "relative overflow-hidden px-4 pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-xl",
        isCollect
          ? "bg-[rgba(251,247,237,0.54)] pb-4"
          : "bg-[rgba(251,247,237,0.82)] pb-3.5 shadow-[0_8px_22px_rgba(31,58,49,0.05),inset_0_1px_0_rgba(255,255,255,0.86)]"
      ].join(" ")}
    >
      {isCollect ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-[-22%] top-[-72px] h-[240px] bg-cover opacity-70"
          style={{
            backgroundImage: `url(${MOBILE_COLLECTION_COLLAGE})`,
            backgroundPosition: "center top"
          }}
        />
      ) : null}
      <div
        aria-hidden="true"
        className={[
          "absolute inset-0",
          isCollect
            ? "bg-[linear-gradient(180deg,rgba(255,253,247,0.70)_0%,rgba(255,253,247,0.22)_74%,rgba(255,253,247,0)_100%)]"
            : "bg-[linear-gradient(135deg,rgba(255,255,255,0.70),rgba(255,255,255,0.22)_48%,rgba(210,230,216,0.20))]"
        ].join(" ")}
      />
      <div className={["relative flex items-start justify-between gap-3", isCollect ? "pt-1" : "items-center"].join(" ")}>
        {isNativeShell ? (
          <div
            aria-hidden="true"
            className={`${MOBILE_HEADER_ICON_BUTTON_CLASS} pointer-events-none ${isCollect ? "hidden" : "opacity-0"}`}
          />
        ) : (
          <button
            aria-label="返回 PC 工作台"
            className={`${MOBILE_HEADER_ICON_BUTTON_CLASS} ${isCollect ? "mt-1" : ""}`}
            onClick={() => {
              window.location.href = getPcReturnHref();
            }}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className={["font-black text-moss", isCollect ? "text-[17px] leading-6" : "text-[11px]"].join(" ")}>
            {isNativeShell ? "OMPC工作站" : "OPC Mobile"}
          </div>
          <h1 className={isCollect ? "mt-1 text-[44px] font-black leading-[1.03] tracking-normal" : "truncate text-[25px] font-black leading-8"}>
            {titles[activeTab]}
          </h1>
          {subtitles[activeTab] ? (
            <p className="mt-3 text-base font-semibold leading-6 text-ink/[0.62]">
              {subtitles[activeTab]}
            </p>
          ) : null}
        </div>
        <button
          aria-label="查看通知状态"
          className={`${MOBILE_HEADER_ICON_BUTTON_CLASS} ${isCollect ? "mt-3 h-[58px] w-[58px] rounded-[24px]" : ""}`}
          onClick={onNotify}
          title="通知状态"
          type="button"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function HomeScreen({
  onAction,
  onChangeTab,
  reviewPendingCount
}: {
  onAction: (message: string) => void;
  onChangeTab: (tab: MobileTab, message?: string) => void;
  reviewPendingCount: number;
}) {
  const visibleQuickMetrics = quickMetrics.map((metric) =>
    metric.tab === "review" ? { ...metric, value: String(reviewPendingCount) } : metric
  );
  const visibleProgressSteps = progressSteps.map((step) =>
    step.tab === "review"
      ? { ...step, state: reviewPendingCount > 0 ? `${reviewPendingCount} 条` : "待处理" }
      : step
  );

  return (
    <div className="space-y-4">
      <section className="relative mt-8 overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] p-5 text-ink shadow-[0_18px_42px_rgba(31,58,49,0.11),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
        <div aria-hidden="true" className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#a8c7ae]/[0.20] blur-2xl" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(236,244,237,0.58))]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black text-muted">
              当前流程
            </span>
            <div className="text-right">
              <div className="text-[24px] font-black leading-8 text-moss">采集优先</div>
              <div className="mt-1 text-[11px] font-bold text-muted">人工确认发布</div>
            </div>
          </div>
          <h2 className="mt-5 text-[29px] font-black leading-9">先采集，再创作</h2>
          <p className="mt-2 max-w-[240px] text-sm font-medium leading-6 text-ink/[0.68]">
            先补高赞参考，再启动草稿和封面，发布仍由人工确认。
          </p>
        </div>
        <button
          className="relative mt-5 flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-[#2f9a55] text-sm font-black text-white shadow-[0_16px_34px_rgba(47,154,85,0.24)] active:scale-[0.99]"
          onClick={() => onChangeTab("create", "已打开创作项目页，可以选择项目开始生成。")}
          type="button"
        >
          <PenLine className="h-4 w-4" />
          查看创作预览
        </button>
      </section>

      <MobilePanel title="快捷入口">
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <Radar className="h-5 w-5" />, label: "采集管理", tab: "collect" as const },
            { icon: <PenLine className="h-5 w-5" />, label: "创作项目", tab: "create" as const },
            { icon: <BookOpenText className="h-5 w-5" />, label: "知识库", tab: "knowledge" as const },
            { icon: <Settings className="h-5 w-5" />, label: "系统设置", tab: "settings" as const }
          ].map((item, index) => (
            <button
              className="flex min-h-[86px] touch-manipulation flex-col items-center justify-center gap-2 rounded-[24px] border border-white/[0.86] bg-[rgba(255,253,247,0.88)] text-xs font-black text-ink shadow-[0_10px_24px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.98]"
              key={`home-shortcut-${index}-${item.tab}`}
              onClick={() => onChangeTab(item.tab)}
              type="button"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#e7f2ea] text-moss">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </MobilePanel>

      <MobilePanel title="历史草稿" action="草稿入口">
        <button
          className="flex w-full touch-manipulation gap-3 rounded-[26px] border border-white/[0.86] bg-[rgba(255,253,247,0.88)] p-3 text-left shadow-[0_10px_26px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99]"
          onClick={() => onChangeTab("create", "已打开历史草稿入口。")}
          type="button"
        >
          <div
            aria-hidden="true"
            className="h-[88px] w-[88px] shrink-0 rounded-[20px] bg-cover bg-center"
            style={{ backgroundImage: `url(${MOBILE_CREATE_CARD_BG})` }}
          />
          <div className="min-w-0 flex-1">
            <div className="inline-flex rounded-full bg-[#e7f2ea] px-2 py-1 text-[10px] font-black text-moss">草稿</div>
            <h3 className="mt-2 text-sm font-black leading-5">查看已生成的图文草稿</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-muted">
              <span className="rounded-full bg-white/[0.78] px-2 py-1">封面预览</span>
              <span className="rounded-full bg-white/[0.78] px-2 py-1">复制文案</span>
              <span className="rounded-full bg-white/[0.78] px-2 py-1">人工确认</span>
            </div>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 text-muted" />
        </button>
      </MobilePanel>

      <MobilePanel
        title="今日待办"
        action={
          <button
            className="rounded-full bg-[#e7f2ea]/[0.90] px-2.5 py-1 text-xs font-black text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
            onClick={() => onAction("今日待办已展开，所有入口都可以继续处理。")}
            type="button"
          >
            全部
          </button>
        }
      >
        <div className="space-y-2">
          {workItems.map((item, index) => (
            <TaskRow
              key={`home-work-item-${index}-${item.tab}`}
              icon={<item.icon className="h-4 w-4" />}
              label={item.label}
              onClick={() => onChangeTab(item.tab)}
              state={item.state}
              testId={`task-${item.tab}`}
            />
          ))}
        </div>
      </MobilePanel>

      <MobilePanel title="生产节奏">
        <div className="mb-3 grid grid-cols-3 gap-2">
          {visibleQuickMetrics.map((metric, index) => (
            <Metric
              key={`home-metric-${index}-${metric.tab}`}
              label={metric.label}
              onClick={() => onChangeTab(metric.tab)}
              testId={`metric-${metric.tab}`}
              tone={metric.tone}
              value={metric.value}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {visibleProgressSteps.map((step, index) => (
            <StepTile
              key={`home-progress-${index}-${step.tab}`}
              icon={<step.icon className="h-4 w-4" />}
              label={step.label}
              onClick={() => onChangeTab(step.tab)}
              state={step.state}
              testId={`step-${step.tab}`}
            />
          ))}
        </div>
      </MobilePanel>
    </div>
  );
}

function BottomNav({ activeTab, onChange }: { activeTab: MobileTab; onChange: (tab: MobileTab) => void }) {
  return (
    <nav
      aria-label="安卓端主导航"
      className="absolute bottom-3 left-4 right-4 z-20 overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_28px_rgba(31,58,49,0.08),0_18px_42px_rgba(31,58,49,0.12),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.66),rgba(255,255,255,0.20)_62%,rgba(216,230,220,0.20))]"
      />
      <div className="relative grid grid-cols-5 gap-1">
        {bottomTabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              aria-label={`${tab.label}${active ? "，当前页面" : ""}`}
              aria-pressed={active}
              key={tab.id}
              className={[
                 "flex min-h-[54px] touch-manipulation flex-col items-center justify-center gap-1 rounded-[22px] border text-[11px] font-black transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-moss/[0.35]",
                 active
                  ? "border-[#2c9053] bg-[linear-gradient(180deg,#30975a,#237f49)] text-white shadow-[0_12px_24px_rgba(35,133,79,0.24),inset_0_1px_0_rgba(255,255,255,0.22)]"
                  : "border-transparent bg-transparent text-muted active:bg-white/[0.48]"
              ].join(" ")}
              data-testid={`mobile-tab-${tab.id}`}
              onClick={() => onChange(tab.id)}
              type="button"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
