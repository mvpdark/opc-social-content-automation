"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  ExternalLink,
  Loader2,
  PenLine,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  X,
  Zap,
  UserRound
} from "lucide-react";

import { PlatformIcon } from "@/components/platform-icon";
import { MobilePanel } from "@/components/mobile-ui";
import {
  MobileReferenceTemplateList,
  ReferencePreviewSheet,
  sampleReferences,
  type SampleReference
} from "@/components/mobile-reference-templates";
import {
  TrendSourceCard,
  TrendSourceReviewSheet,
  mobilePlatformText,
  sanitizeMobileTrendItems,
  type MobileTrendContent
} from "@/components/mobile-trend-source-review";
import {
  collectionJobDiagnosticItems,
  type CollectionJobDiagnosticItem,
  formatCollectionJobStatus,
  isActiveCollectionJob
} from "@/lib/collection-job-status";
import {
  COLLECTION_SCHEDULE_STORAGE_KEY,
  authHeaders,
  readApiError,
  readMobileStorage,
  writeMobileStorage,
  type CredentialSettings,
  type MobilePlatform
} from "@/lib/mobile-runtime";
import { addMobileBackHandler } from "@/lib/mobile-back-navigation";

import {
  TREND_REVIEW_QUEUE_STORAGE_KEY,
  mobileDiagnosticToneClass,
  normalizeTrendReviewQueueStorage,
  type CollectionScheduleStorage,
  type LinkImportTarget,
  type MobileCollectionJob,
  type TrendReviewQueueStorage
} from "@/components/mobile-collect-utils";

export function CollectScreen({
  active = true,
  apiBase,
  credentials,
  onAction
}: {
  active?: boolean;
  apiBase: string;
  credentials: CredentialSettings;
  onAction: (message: string) => void;
}) {
  const [platform, setPlatform] = useState<MobilePlatform>("xiaohongshu");
  const [query, setQuery] = useState("硕升博 高赞图文");
  const [maxItems, setMaxItems] = useState(20);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [nextRunAt, setNextRunAt] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<number | null>(null);
  const [activeCollectionJobId, setActiveCollectionJobId] = useState<number | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState("定时采集未启用。");
  const [diagnosticItems, setDiagnosticItems] = useState<CollectionJobDiagnosticItem[]>([]);
  const [trendItems, setTrendItems] = useState<MobileTrendContent[]>([]);
  const [selectedTrendIds, setSelectedTrendIds] = useState<number[]>([]);
  const [reviewedTrendIds, setReviewedTrendIds] = useState<number[]>([]);
  const [dismissedTrendIds, setDismissedTrendIds] = useState<number[]>([]);
  const [deletingTrendIds, setDeletingTrendIds] = useState<number[]>([]);
  const [selectedTrendItem, setSelectedTrendItem] = useState<MobileTrendContent | null>(null);
  const [trendListLoading, setTrendListLoading] = useState(false);
  const [trendListStatus, setTrendListStatus] = useState("正在读取采集素材...");
  const [linkText, setLinkText] = useState("");
  const [linkResult, setLinkResult] = useState<LinkImportTarget | null>(null);
  const [selectedReference, setSelectedReference] = useState<string>(sampleReferences[0].title);
  const [referencePreview, setReferencePreview] = useState<SampleReference | null>(null);
  const [busyAction, setBusyAction] = useState<"digest" | "job" | "link" | "search" | null>(null);
  const scheduleRunningRef = useRef(false);
  const trendItemsReadyRef = useRef(false);
  const trendReviewQueueHydratedRef = useRef(false);
  const skipNextTrendReviewQueueWriteRef = useRef(false);
  const collectedMetricValue =
    diagnosticItems.find((item) => item.label === "已采集")?.value ?? "0";
  const selectedTrendIdSet = new Set(selectedTrendIds);
  const reviewedTrendIdSet = new Set(reviewedTrendIds);
  const dismissedTrendIdSet = new Set(dismissedTrendIds);
  const pendingTrendItems = trendItems.filter(
    (item) => !reviewedTrendIdSet.has(item.id) && !dismissedTrendIdSet.has(item.id)
  );
  const pendingTrendIdSet = new Set(pendingTrendItems.map((item) => item.id));
  const selectedPendingCount = selectedTrendIds.filter((id) => pendingTrendIdSet.has(id)).length;
  const allPendingSelected =
    pendingTrendItems.length > 0 && pendingTrendItems.every((item) => selectedTrendIdSet.has(item.id));
  const sourceReviewed = reviewedTrendIds.length > 0;
  const collectionBusy = busyAction !== null || activeCollectionJobId !== null;

  useEffect(() => {
    return addMobileBackHandler(() => {
      if (!active) {
        return false;
      }
      if (selectedTrendItem) {
        setSelectedTrendItem(null);
        onAction("已关闭采集素材详情。");
        return true;
      }
      if (referencePreview) {
        setReferencePreview(null);
        onAction("已关闭参考预览。");
        return true;
      }
      if (selectedTrendIds.length > 0) {
        setSelectedTrendIds([]);
        onAction("已清空采集来源选择。");
        return true;
      }
      return false;
    });
  }, [active, onAction, referencePreview, selectedTrendIds.length, selectedTrendItem]);

  useEffect(() => {
    try {
      const stored = readMobileStorage(COLLECTION_SCHEDULE_STORAGE_KEY);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored) as Partial<CollectionScheduleStorage>;
      if (parsed.platform === "xiaohongshu" || parsed.platform === "douyin") {
        setPlatform(parsed.platform);
      }
      if (typeof parsed.keyword === "string" && parsed.keyword.trim()) {
        setQuery(parsed.keyword);
      }
      if (typeof parsed.maxItems === "number") {
        setMaxItems(parsed.maxItems);
      }
      if (typeof parsed.intervalMinutes === "number") {
        setIntervalMinutes(parsed.intervalMinutes);
      }
      setAutoEnabled(Boolean(parsed.autoEnabled));
      setNextRunAt(parsed.nextRunAt ?? null);
      setLastRunAt(parsed.lastRunAt ?? null);
      setLastJobId(parsed.lastJobId ?? null);
      setScheduleMessage(parsed.scheduleMessage ?? "已读取定时采集配置。");
    } catch (_error) {
      setScheduleMessage("定时采集配置读取失败，请重新保存。");
    }
  }, []);

  useEffect(() => {
    skipNextTrendReviewQueueWriteRef.current = true;
    try {
      const stored = readMobileStorage(TREND_REVIEW_QUEUE_STORAGE_KEY);
      const contextQuery = query.trim();
      const parsed = stored
        ? normalizeTrendReviewQueueStorage(JSON.parse(stored), {
            platform,
            query: contextQuery
          })
        : null;
      setReviewedTrendIds(
        parsed && parsed.platform === platform && parsed.query === contextQuery
          ? parsed.reviewedTrendIds
          : []
      );
      setDismissedTrendIds(parsed?.dismissedTrendIds ?? []);
    } catch (_error) {
      setReviewedTrendIds([]);
      setDismissedTrendIds([]);
    } finally {
      trendReviewQueueHydratedRef.current = true;
    }
  }, [platform, query]);

  useEffect(() => {
    const payload: CollectionScheduleStorage = {
      autoEnabled,
      intervalMinutes,
      keyword: query,
      lastJobId,
      lastRunAt,
      maxItems,
      nextRunAt,
      platform,
      scheduleMessage
    };
    writeMobileStorage(COLLECTION_SCHEDULE_STORAGE_KEY, JSON.stringify(payload));
  }, [
    autoEnabled,
    intervalMinutes,
    lastJobId,
    lastRunAt,
    maxItems,
    nextRunAt,
    platform,
    query,
    scheduleMessage
  ]);

  useEffect(() => {
    if (!trendReviewQueueHydratedRef.current) {
      return;
    }
    if (skipNextTrendReviewQueueWriteRef.current) {
      skipNextTrendReviewQueueWriteRef.current = false;
      return;
    }
    const payload: TrendReviewQueueStorage = {
      dismissedTrendIds,
      platform,
      query: query.trim(),
      reviewedTrendIds
    };
    writeMobileStorage(TREND_REVIEW_QUEUE_STORAGE_KEY, JSON.stringify(payload));
  }, [dismissedTrendIds, platform, query, reviewedTrendIds]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!autoEnabled || !nextRunAt || scheduleRunningRef.current) {
        return;
      }
      if (Date.now() < new Date(nextRunAt).getTime()) {
        return;
      }
      void runCollectionJob("schedule");
    }, 10000);
    return () => window.clearInterval(timer);
  }, [autoEnabled, nextRunAt, platform, query, maxItems, intervalMinutes, credentials]);

  useEffect(() => {
    if (lastJobId || activeCollectionJobId !== null || !credentials.workspaceToken.trim()) {
      return undefined;
    }

    let cancelled = false;

    async function restoreLatestJob() {
      try {
        const job = await fetchLatestCollectionJob();
        if (cancelled || !job) {
          return;
        }
        setLastJobId(job.id);
        setLastRunAt(job.updated_at ?? job.created_at ?? null);
        setScheduleMessage(formatCollectionJobStatus(job, "mobile"));
        setDiagnosticItems(collectionJobDiagnosticItems(job));
        if (isActiveCollectionJob(job)) {
          setActiveCollectionJobId(job.id);
        }
      } catch {
        // No saved mobile job yet, or the current account cannot read collection history.
      }
    }

    void restoreLatestJob();

    return () => {
      cancelled = true;
    };
  }, [activeCollectionJobId, credentials.workspaceToken, lastJobId]);

  useEffect(() => {
    if (!lastJobId || activeCollectionJobId !== null) {
      return undefined;
    }

    let cancelled = false;

    async function refreshLastJob() {
      try {
        const job = await fetchCollectionJobStatus(lastJobId as number);
        if (cancelled) {
          return;
        }
        setScheduleMessage(formatCollectionJobStatus(job, "mobile"));
        setDiagnosticItems(collectionJobDiagnosticItems(job));
        if (isActiveCollectionJob(job)) {
          setActiveCollectionJobId(job.id);
        }
      } catch {
        // The user can still create a fresh collection task if the old job no longer exists.
      }
    }

    void refreshLastJob();

    return () => {
      cancelled = true;
    };
  }, [activeCollectionJobId, credentials.workspaceToken, lastJobId]);

  useEffect(() => {
    if (activeCollectionJobId === null) {
      return undefined;
    }

    let cancelled = false;
    let timer: number | undefined;

    async function pollCollectionJob() {
      try {
        const job = await fetchCollectionJobStatus(activeCollectionJobId as number);
        if (cancelled) {
          return;
        }
        const message = formatCollectionJobStatus(job, "mobile");
        setScheduleMessage(message);
        setDiagnosticItems(collectionJobDiagnosticItems(job));
        if (!isActiveCollectionJob(job)) {
          setActiveCollectionJobId(null);
          onAction(message);
          if (job.status === "completed") {
            void loadTrendItems(true);
          }
          return;
        }
        timer = window.setTimeout(pollCollectionJob, 3000);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setScheduleMessage(error instanceof Error ? error.message : "采集状态刷新失败。");
        setDiagnosticItems([]);
        timer = window.setTimeout(pollCollectionJob, 5000);
      }
    }

    timer = window.setTimeout(pollCollectionJob, 800);

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [activeCollectionJobId, credentials.workspaceToken, onAction]);

  useEffect(() => {
    void loadTrendItems(false);
  }, [credentials.workspaceToken, maxItems, platform]);

  useEffect(() => {
    if (!trendItemsReadyRef.current) {
      return;
    }
    const validIds = new Set(trendItems.map((item) => item.id));
    setSelectedTrendIds((currentIds) => currentIds.filter((id) => validIds.has(id)));
    setReviewedTrendIds((currentIds) => currentIds.filter((id) => validIds.has(id)));
    setDismissedTrendIds((currentIds) => currentIds.filter((id) => validIds.has(id)));
    setSelectedTrendItem((currentItem) =>
      currentItem ? trendItems.find((item) => item.id === currentItem.id) ?? null : null
    );
  }, [trendItems]);

  useEffect(() => {
    setSelectedTrendIds([]);
    setSelectedTrendItem(null);
  }, [platform, query]);

  function formatScheduleTime(value: string | null) {
    if (!value) {
      return "未安排";
    }
    return new Date(value).toLocaleString("zh-CN", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "2-digit"
    });
  }

  function scheduleNextRun(fromDate = new Date()) {
    const safeInterval = Number.isFinite(intervalMinutes) ? Math.max(5, intervalMinutes) : 60;
    const nextDate = new Date(fromDate.getTime() + safeInterval * 60_000);
    setNextRunAt(nextDate.toISOString());
    return nextDate;
  }

  async function fetchLatestCollectionJob() {
    const response = await fetch(`${apiBase}/trends/jobs?limit=1`, {
      headers: authHeaders(credentials)
    });
    if (!response.ok) {
      throw new Error(await readApiError(response, "最近采集状态读取失败。"));
    }
    const jobs = (await response.json()) as MobileCollectionJob[];
    return jobs[0] ?? null;
  }

  async function fetchCollectionJobStatus(jobId: number) {
    const response = await fetch(`${apiBase}/trends/jobs/${jobId}`, {
      headers: authHeaders(credentials)
    });
    if (!response.ok) {
      throw new Error(await readApiError(response, "采集状态刷新失败。"));
    }
    return (await response.json()) as MobileCollectionJob;
  }

  async function loadTrendItems(announce = false) {
    const limit = Math.min(100, Math.max(20, maxItems));
    const params = new URLSearchParams({
      limit: String(limit),
      platform
    });
    setTrendListLoading(true);
    setTrendListStatus("正在读取采集素材...");
    try {
      const response = await fetch(`${apiBase}/trends/list?${params.toString()}`, {
        headers: authHeaders(credentials)
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "采集素材读取失败。"));
      }
      const items = sanitizeMobileTrendItems(await response.json());
      const nextStatus = items.length
        ? `已显示最近 ${items.length} 条${mobilePlatformText(platform)}采集素材。`
        : "还没有可确认的采集素材，先运行采集或导入链接。";
      trendItemsReadyRef.current = true;
      setTrendItems(items);
      setTrendListStatus(nextStatus);
      if (announce) {
        onAction(nextStatus);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "采集素材读取失败。";
      trendItemsReadyRef.current = false;
      setTrendItems([]);
      setTrendListStatus(message);
      if (announce) {
        onAction(message);
      }
    } finally {
      setTrendListLoading(false);
    }
  }

  function saveSchedule() {
    if (!query.trim()) {
      onAction("先填写关键词，再保存定时采集设置。");
      return;
    }
    const nextDate = autoEnabled ? scheduleNextRun() : null;
    if (!autoEnabled) {
      setNextRunAt(null);
      setScheduleMessage("定时采集已保存，但当前未启用。");
      onAction("定时采集已保存，当前未启用。");
      return;
    }
    const message = `定时采集已启用，下次运行：${formatScheduleTime(nextDate?.toISOString() ?? null)}。`;
    setScheduleMessage(message);
    onAction(message);
  }

  async function openSearchPage() {
    const keyword = query.trim();
    if (!keyword) {
      onAction("先填关键词，再打开平台搜索。");
      return;
    }

    const searchUrl =
      platform === "xiaohongshu"
        ? `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`
        : `https://www.douyin.com/search/${encodeURIComponent(keyword)}`;
    window.open(searchUrl, "_blank", "noopener,noreferrer");
    onAction(`已打开${platform === "xiaohongshu" ? "小红书" : "抖音"}搜索：${keyword}`);
  }

  async function runCollectionJob(source: "manual" | "schedule") {
    const keyword = query.trim();
    if (!keyword) {
      onAction("先填关键词，再开始采集。");
      return;
    }

    scheduleRunningRef.current = true;
    setBusyAction("job");
    const startedAt = new Date();
    const runLabel = source === "schedule" ? "定时采集" : "立即采集";
    onAction(`${runLabel}正在准备采集。`);
    try {
      const response = await fetch(`${apiBase}/trends/jobs`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify({
          platform,
          keyword,
          content_kind: "image_text",
          max_items: maxItems,
          min_delay_seconds: 4,
          max_delay_seconds: 12,
          operator_wait_seconds: 30,
          session_label: platform,
          persist_session: true,
          persist_cookies: true
        })
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "开始采集失败。"));
      }
      const data = (await response.json()) as MobileCollectionJob;
      const nextDate = autoEnabled ? scheduleNextRun(startedAt) : null;
      setLastJobId(data.id);
      setLastRunAt(startedAt.toISOString());
      setActiveCollectionJobId(data.id);
      setDiagnosticItems(collectionJobDiagnosticItems(data));
      const message = `${runLabel}已开始，${formatCollectionJobStatus(data, "mobile")}${
        nextDate ? ` 下次运行：${formatScheduleTime(nextDate.toISOString())}。` : ""
      }`;
      setScheduleMessage(message);
      onAction(message);
    } catch (error) {
      const nextDate = autoEnabled ? scheduleNextRun(startedAt) : null;
      const message = error instanceof Error ? error.message : "开始采集失败。";
      setScheduleMessage(
        `${runLabel}失败：${message}${nextDate ? ` 下次重试：${formatScheduleTime(nextDate.toISOString())}。` : ""}`
      );
      setDiagnosticItems([]);
      onAction(message);
    } finally {
      scheduleRunningRef.current = false;
      setBusyAction(null);
    }
  }

  async function parseLinks() {
    if (platform !== "xiaohongshu") {
      onAction("链接导入当前只支持小红书；抖音请用关键词采集。");
      return;
    }
    if (!linkText.trim()) {
      onAction("先粘贴小红书分享文本或链接。");
      return;
    }

    setBusyAction("link");
    onAction("正在解析小红书链接。");
    try {
      const response = await fetch(`${apiBase}/trends/link-import-target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: linkText,
          max_links: 10,
          download_media: false,
          persist_cookies: false
        })
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "链接解析失败。"));
      }
      const data = (await response.json()) as LinkImportTarget;
      setLinkResult(data);
      onAction(`已解析 ${data.extracted_count} 个链接，可导入 ${data.accepted_count} 个。`);
    } catch (error) {
      onAction(error instanceof Error ? error.message : "链接解析失败。");
    } finally {
      setBusyAction(null);
    }
  }

  function toggleTrendSelection(itemId: number) {
    if (!pendingTrendIdSet.has(itemId)) {
      return;
    }
    setSelectedTrendIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((id) => id !== itemId)
        : [...currentIds, itemId]
    );
  }

  function selectVisibleTrendItems() {
    if (!pendingTrendItems.length) {
      onAction("当前没有可选素材，请先运行采集。");
      return;
    }
    setSelectedTrendIds(pendingTrendItems.map((item) => item.id));
    onAction(`已选中 ${pendingTrendItems.length} 条待确认素材，请继续人工确认。`);
  }

  function clearTrendSelection() {
    setSelectedTrendIds([]);
    onAction("已清空已选采集素材。");
  }

  function confirmSelectedTrendSources() {
    if (!selectedTrendIds.length) {
      onAction("先选择至少一条采集素材，再确认来源。");
      return;
    }
    const nextReviewedIds = selectedTrendIds.filter((id) => pendingTrendIdSet.has(id));
    if (!nextReviewedIds.length) {
      setSelectedTrendIds([]);
      onAction("当前选择已经处理过，请继续选择新的采集素材。");
      return;
    }
    setReviewedTrendIds((currentIds) => Array.from(new Set([...currentIds, ...nextReviewedIds])));
    setSelectedTrendIds([]);
    onAction(`已人工确认 ${nextReviewedIds.length} 条来源，可保存摘要，也可以继续采集下一批。`);
  }

  function confirmSingleTrendSource(item: MobileTrendContent) {
    setSelectedTrendIds((currentIds) => currentIds.filter((id) => id !== item.id));
    setReviewedTrendIds((currentIds) =>
      currentIds.includes(item.id) ? currentIds : [...currentIds, item.id]
    );
    setSelectedTrendItem(null);
    onAction(`已确认来源：${item.title}。可保存摘要，也可以继续采集下一批。`);
  }

  async function deleteTrendSource(item: MobileTrendContent) {
    if (deletingTrendIds.includes(item.id)) {
      return;
    }
    setDeletingTrendIds((currentIds) => [...currentIds, item.id]);
    onAction(`正在删除采集素材：${item.title}`);
    try {
      const response = await fetch(`${apiBase}/trends/${item.id}`, {
        headers: authHeaders(credentials),
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "采集素材删除失败。"));
      }
      setTrendItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id));
      setSelectedTrendIds((currentIds) => currentIds.filter((id) => id !== item.id));
      setReviewedTrendIds((currentIds) => currentIds.filter((id) => id !== item.id));
      setDismissedTrendIds((currentIds) => currentIds.filter((id) => id !== item.id));
      setSelectedTrendItem((currentItem) => (currentItem?.id === item.id ? null : currentItem));
      onAction(`已删除采集素材：${item.title}`);
    } catch (error) {
      onAction(error instanceof Error ? error.message : "采集素材删除失败。");
    } finally {
      setDeletingTrendIds((currentIds) => currentIds.filter((id) => id !== item.id));
    }
  }

  function openTrendSourceUrl(item: MobileTrendContent) {
    if (!item.url) {
      onAction("这条素材没有来源链接。");
      return;
    }
    window.open(item.url, "_blank", "noopener,noreferrer");
    onAction("已打开采集来源链接。");
  }

  async function saveKnowledgeDigest() {
    const keyword = query.trim();
    if (!keyword) {
      onAction("先填关键词，再保存知识摘要。");
      return;
    }
    if (!reviewedTrendIds.length) {
      onAction("先在“采集结果确认”里确认至少一条素材。");
      return;
    }
    if (!sourceReviewed) {
      onAction("先确认已选采集来源，再保存知识摘要。");
      return;
    }

    setBusyAction("digest");
    onAction("正在从采集素材生成知识摘要。");
    try {
      const response = await fetch(`${apiBase}/trends/knowledge-digest`, {
        method: "POST",
        headers: authHeaders(credentials),
        body: JSON.stringify({
          platform,
          keyword,
          trend_ids: reviewedTrendIds,
          limit: Math.min(100, reviewedTrendIds.length),
          category: "trend-insight",
          source_reviewed: true
        })
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "知识摘要生成失败。"));
      }
      const data = (await response.json()) as { item_count: number; knowledge_id: number };
      const savedTrendIds = [...reviewedTrendIds];
      setDismissedTrendIds((currentIds) => Array.from(new Set([...currentIds, ...savedTrendIds])));
      setSelectedTrendIds([]);
      setReviewedTrendIds([]);
      setSelectedTrendItem((currentItem) =>
        currentItem && savedTrendIds.includes(currentItem.id) ? null : currentItem
      );
      onAction(`知识条目 #${data.knowledge_id} 已生成，来源素材 ${data.item_count} 条。`);
    } catch (error) {
      onAction(error instanceof Error ? error.message : "知识摘要生成失败。");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="-mt-1 space-y-3 pb-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/[0.92] bg-[rgba(255,253,247,0.82)] px-3.5 pb-2 pt-2.5 shadow-[0_22px_46px_rgba(31,58,49,0.13),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-xl">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url(/mobile-assets/collection-collage.png)" }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(105deg,rgba(255,253,247,0.96)_0%,rgba(255,253,247,0.84)_52%,rgba(234,241,232,0.72)_100%)]" />
        <div aria-hidden="true" className="absolute -left-7 top-9 h-[74px] w-[74px] rounded-full border border-dashed border-[#2f9a55]/[0.28]" />
        <div aria-hidden="true" className="absolute left-8 top-[66px] flex h-14 w-14 items-center justify-center rounded-full bg-[conic-gradient(#2f9a55_0_28%,rgba(47,154,85,0.12)_28%_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,253,247,0.94)] text-[#2f9a55] shadow-[0_10px_24px_rgba(31,58,49,0.08)]">
            <Clock3 className="h-5 w-5" />
          </div>
        </div>

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <h2 className="max-w-[210px] text-[23px] font-black leading-7 tracking-normal text-ink">
              高赞图文采集
            </h2>
            <span className="shrink-0 rounded-full border border-white/[0.88] bg-[rgba(231,242,234,0.82)] px-3.5 py-1.5 text-xs font-black text-[#23854f] shadow-[inset_0_1px_0_rgba(255,255,255,0.90)]">
              {autoEnabled ? "运行中" : "待开启"}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-[70px_1fr] items-center gap-3">
            <div aria-hidden="true" className="h-14" />
            <div className="min-w-0">
              <p className="text-[14px] font-black leading-5 text-ink">
                每 <span className="px-1 text-[20px] text-[#2f9a55]">{intervalMinutes}</span> 分钟执行一次
              </p>
              <button
                className="mt-1 flex h-9 w-full touch-manipulation items-center justify-center gap-3 rounded-full bg-[linear-gradient(180deg,#35a95f,#23854f)] text-sm font-black text-white shadow-[0_16px_30px_rgba(35,133,79,0.28),inset_0_1px_0_rgba(255,255,255,0.24)] active:scale-[0.99]"
                onClick={() => onAction("定时采集任务详情已展开，可以继续修改周期和来源。")}
                type="button"
              >
                查看详情
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-1.5 grid grid-cols-3 divide-x divide-[#d9d0c1] rounded-[23px] border border-white/[0.82] bg-[rgba(255,253,247,0.76)] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
            <div className="px-2 text-center">
              <div className="text-[21px] font-black leading-6 text-[#2f9a55]">{maxItems}</div>
              <div className="mt-1 text-[11px] font-bold text-muted">今日目标</div>
            </div>
            <div className="px-2 text-center">
              <div className="text-[21px] font-black leading-6 text-ink">{collectedMetricValue}</div>
              <div className="mt-1 text-[11px] font-bold text-muted">已采集</div>
            </div>
            <div className="min-w-0 px-2 text-center">
              <div className="truncate text-[17px] font-black leading-6 text-ink">{formatScheduleTime(nextRunAt)}</div>
              <div className="mt-1 text-[11px] font-bold text-muted">下次执行</div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[32px] border border-white/[0.92] bg-[rgba(255,253,247,0.90)] p-2.5 shadow-[0_18px_42px_rgba(31,58,49,0.10),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-xl">
        <div aria-hidden="true" className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-[#2f9a55]/[0.08] blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[21px] font-black leading-7">定时采集设置</h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#e7f2ea]/[0.88] px-2.5 py-1 text-[11px] font-black text-[#23854f]">
                {autoEnabled ? "运行中" : "可启用"}
              </span>
              <label className="relative inline-flex h-8 w-[58px] touch-manipulation items-center">
                <input
                  checked={autoEnabled}
                  className="peer sr-only"
                  data-testid="mobile-auto-collect-enabled"
                  onChange={(event) => setAutoEnabled(event.target.checked)}
                  type="checkbox"
                />
                <span className="absolute inset-0 rounded-full border border-white/[0.88] bg-[#dfe7dd] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition peer-checked:bg-[linear-gradient(180deg,#37a95f,#23854f)]" />
                <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-[0_7px_16px_rgba(31,58,49,0.16)] transition peer-checked:translate-x-6" />
              </label>
            </div>
          </div>

          <label className="mt-2.5 flex items-start gap-2.5">
            <input
              checked={autoEnabled}
              className="peer sr-only"
              onChange={(event) => setAutoEnabled(event.target.checked)}
              type="checkbox"
            />
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border border-[#2f9a55]/[0.38] bg-[#2f9a55] text-white shadow-[0_10px_18px_rgba(47,154,85,0.18)] peer-focus-visible:ring-2 peer-focus-visible:ring-moss/[0.25]">
              <Check className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-black leading-5">启用定时采集</span>
              <span className="mt-0.5 block line-clamp-1 text-[10px] font-semibold leading-4 text-muted">
                页面保持打开时会按间隔自动开始采集，不参与一键生成。
              </span>
            </span>
          </label>

          <label className="mt-2 block">
            <span className="sr-only">关键词</span>
            <div className="flex h-9 items-center gap-2.5 rounded-full border border-[#ded8cc] bg-[rgba(255,253,247,0.82)] px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
              <Search className="h-5 w-5 shrink-0 text-muted" />
              <input
                aria-label="采集关键词"
                className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none"
                data-testid="mobile-collect-query"
                onChange={(event) => setQuery(event.target.value)}
                value={query}
              />
              {query ? (
                <button
                  aria-label="清空关键词"
                  className="flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-full text-muted active:bg-white/[0.62]"
                  onClick={() => setQuery("")}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </label>

          <div className="mt-2 grid grid-cols-2 gap-3">
            <button
              aria-pressed={platform === "xiaohongshu"}
              className={[
                "flex h-9 touch-manipulation items-center justify-center gap-2 rounded-full border text-sm font-black transition active:scale-[0.98]",
                platform === "xiaohongshu"
                  ? "border-[#23854f] bg-[linear-gradient(180deg,#35a95f,#23854f)] text-white shadow-[0_14px_28px_rgba(35,133,79,0.24)]"
                  : "border-[#ded8cc] bg-[rgba(255,253,247,0.70)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]"
              ].join(" ")}
              data-testid="platform-xiaohongshu"
              onClick={() => {
                setPlatform("xiaohongshu");
                onAction("已切换到小红书图文采集。");
              }}
              type="button"
            >
              <PlatformIcon platform="xiaohongshu" size="sm" />
              小红书
            </button>
            <button
              aria-pressed={platform === "douyin"}
              className={[
                "flex h-9 touch-manipulation items-center justify-center gap-2 rounded-full border text-sm font-black transition active:scale-[0.98]",
                platform === "douyin"
                  ? "border-[#23854f] bg-[linear-gradient(180deg,#35a95f,#23854f)] text-white shadow-[0_14px_28px_rgba(35,133,79,0.24)]"
                  : "border-[#ded8cc] bg-[rgba(255,253,247,0.70)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]"
              ].join(" ")}
              data-testid="platform-douyin"
              onClick={() => {
                setPlatform("douyin");
                onAction("已切换到抖音图文采集。");
              }}
              type="button"
            >
              <PlatformIcon platform="douyin" size="sm" />
              抖音图文
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="rounded-[20px] border border-[#ded8cc] bg-[rgba(255,253,247,0.76)] px-4 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
              <span className="text-xs font-semibold text-muted">最大采集</span>
              <div className="mt-1 flex items-end gap-2">
                <input
                  className="min-w-0 flex-1 bg-transparent text-[20px] font-black leading-6 text-ink outline-none"
                  data-testid="mobile-max-items"
                  max={100}
                  min={1}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    setMaxItems(Number.isFinite(nextValue) ? nextValue : 20);
                  }}
                  type="number"
                  value={maxItems}
                />
                <span className="pb-1 text-sm font-semibold text-muted">条</span>
                <ChevronDown className="mb-1 h-4 w-4 text-muted" />
              </div>
            </label>
            <label className="rounded-[20px] border border-[#ded8cc] bg-[rgba(255,253,247,0.76)] px-4 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
              <span className="text-xs font-semibold text-muted">间隔</span>
              <div className="mt-1 flex items-end gap-2">
                <input
                  className="min-w-0 flex-1 bg-transparent text-[20px] font-black leading-6 text-ink outline-none"
                  data-testid="mobile-collect-interval"
                  max={1440}
                  min={5}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    setIntervalMinutes(Number.isFinite(nextValue) ? nextValue : 60);
                  }}
                  type="number"
                  value={intervalMinutes}
                />
                <span className="pb-1 text-sm font-semibold text-muted">分钟</span>
                <ChevronDown className="mb-1 h-4 w-4 text-muted" />
              </div>
            </label>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3">
            <button
              className="flex h-10 touch-manipulation items-center justify-center gap-2 rounded-full border border-[#2f9a55]/[0.48] bg-[rgba(255,253,247,0.72)] text-sm font-black text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99]"
              data-testid="mobile-save-schedule"
              onClick={saveSchedule}
              type="button"
            >
              <Save className="h-5 w-5" />
              保存定时
            </button>
            <button
              className="flex h-10 touch-manipulation items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#191d1b,#0e1110)] text-sm font-black text-white shadow-[0_16px_32px_rgba(16,18,17,0.22),inset_0_1px_0_rgba(255,255,255,0.16)] active:scale-[0.99] disabled:opacity-60"
              data-testid="mobile-run-collection-now"
              disabled={busyAction === "job"}
              onClick={() => void runCollectionJob("manual")}
              type="button"
            >
              {busyAction === "job" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
              {busyAction === "job" ? "运行中" : "立即运行"}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2" data-testid="mobile-collection-diagnostic-grid">
            {diagnosticItems.length ? (
              diagnosticItems.slice(0, 8).map((item, index) => (
                <div
                  className={`min-w-0 rounded-[18px] border px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] ${mobileDiagnosticToneClass(item.tone)}`}
                  key={`mobile-diagnostic-${item.label}-${index}`}
                >
                  <div className="truncate text-[11px] font-black leading-4 opacity-75">{item.label}</div>
                  <div className="mt-0.5 line-clamp-2 text-[14px] font-black leading-5">{item.value}</div>
                </div>
              ))
            ) : (
              <div className="col-span-2 rounded-[18px] border border-[#ded8cc] bg-[rgba(255,253,247,0.72)] px-3 py-2 text-[13px] font-bold leading-5 text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                {scheduleMessage}
              </div>
            )}
          </div>

          <div className="sr-only">
            {scheduleMessage}
            {diagnosticItems.map((item) => `${item.label}${item.value}`).join(" ")}
            下次运行：{formatScheduleTime(nextRunAt)}
            上次运行：{formatScheduleTime(lastRunAt)}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[30px] border border-white/[0.92] bg-[rgba(255,253,247,0.88)] p-3 shadow-[0_18px_40px_rgba(31,58,49,0.09),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-1 pb-2">
          <h2 className="text-[22px] font-black leading-7">采集结果确认</h2>
          <div className="flex items-center gap-3 text-sm font-black">
            <span>
              待确认 {pendingTrendItems.length}
              {reviewedTrendIds.length ? ` · 待保存 ${reviewedTrendIds.length}` : ""}
            </span>
            <button
              className="flex touch-manipulation items-center gap-1 rounded-full px-2 py-1 text-[#23854f] active:bg-[#e7f2ea]"
              disabled={trendListLoading}
              onClick={() => void loadTrendItems(true)}
              type="button"
            >
              {trendListLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              刷新
            </button>
          </div>
        </div>
        <p className="sr-only" data-testid="mobile-trend-list-status">{trendListStatus}</p>
        <span className="sr-only" data-testid="mobile-source-reviewed">
          {sourceReviewed ? "已确认" : "待确认"}
        </span>

        <div className="max-h-[310px] space-y-2 overflow-y-auto pr-0.5" data-testid="mobile-trend-source-list">
          {pendingTrendItems.length ? (
            pendingTrendItems.map((item) => (
              <TrendSourceCard
                deleting={deletingTrendIds.includes(item.id)}
                item={item}
                key={`mobile-trend-source-${item.id}`}
                onConfirmSwipe={() => confirmSingleTrendSource(item)}
                onDeleteSwipe={() => void deleteTrendSource(item)}
                onOpen={() => {
                  setSelectedTrendItem(item);
                  onAction("已打开采集素材详情。");
                }}
                onOpenUrl={() => openTrendSourceUrl(item)}
                onToggle={() => toggleTrendSelection(item.id)}
                reviewed={reviewedTrendIdSet.has(item.id)}
                selected={selectedTrendIdSet.has(item.id)}
              />
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#d6e8df] bg-white/[0.54] px-4 py-5 text-center text-xs font-semibold leading-5 text-muted">
              {trendListLoading
                ? "正在读取采集素材..."
                : reviewedTrendIds.length
                  ? "本批来源已确认，可先保存摘要；继续运行采集会显示新素材。"
                  : "暂无可确认素材，点击立即运行或刷新素材。"}
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full border border-[#d6e8df] bg-white/[0.76] text-sm font-black text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99] disabled:opacity-60"
            disabled={!selectedTrendIds.length}
            onClick={confirmSelectedTrendSources}
            type="button"
          >
            <ShieldCheck className="h-4 w-4" />
            确认所选
          </button>
          <button
            className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full bg-[#23854f] text-sm font-black text-white shadow-[0_12px_26px_rgba(35,133,79,0.18)] active:scale-[0.99] disabled:opacity-60"
            data-testid="mobile-save-digest"
            disabled={busyAction === "digest" || !sourceReviewed}
            onClick={saveKnowledgeDigest}
            type="button"
          >
            {busyAction === "digest" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {busyAction === "digest"
              ? "保存中"
              : reviewedTrendIds.length
                ? `保存 ${reviewedTrendIds.length} 条摘要`
                : "保存摘要"}
          </button>
        </div>

        {reviewedTrendIds.length ? (
          <div className="mt-2 rounded-[22px] border border-[#d6e8df] bg-[#f4fbf6] px-3 py-2">
            <p className="text-[11px] font-semibold leading-5 text-[#3f6f58]">
              已确认 {reviewedTrendIds.length} 条素材，仍会保留在待保存摘要里；需要补充素材时可直接采下一批。
            </p>
            <button
              className="mt-2 flex h-10 w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-white text-xs font-black text-[#23854f] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99] disabled:opacity-60"
              data-testid="mobile-collect-next-batch"
              disabled={collectionBusy}
              onClick={() => void runCollectionJob("manual")}
              type="button"
            >
              {busyAction === "job" || activeCollectionJobId !== null ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {busyAction === "job" || activeCollectionJobId !== null ? "采集中" : "继续采集下一批"}
            </button>
          </div>
        ) : null}

        <button
          className="mt-2 flex h-10 w-full touch-manipulation items-center justify-center rounded-full border border-white/[0.82] bg-white/[0.52] text-xs font-black text-muted active:scale-[0.99]"
          disabled={busyAction === "job"}
          onClick={
            pendingTrendItems.length
              ? allPendingSelected
                ? clearTrendSelection
                : selectVisibleTrendItems
              : () => void runCollectionJob("manual")
          }
          type="button"
        >
          {pendingTrendItems.length
            ? allPendingSelected
              ? "清空选择"
              : selectedPendingCount
                ? `已选 ${selectedPendingCount} 条`
                : "全选待确认"
            : busyAction === "job"
              ? "运行中"
              : "继续运行采集获取新素材"}
        </button>
      </section>

      <MobilePanel title="手动采集">
        <textarea
          className="min-h-24 w-full resize-y rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 py-3 text-sm leading-6 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none"
          data-testid="mobile-link-text"
          onChange={(event) => setLinkText(event.target.value)}
          placeholder="粘贴小红书分享文本或链接"
          value={linkText}
        />
        <button
          className="mt-3 flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-[#23854f] text-sm font-semibold text-white shadow-[0_12px_26px_rgba(35,133,79,0.18)] active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-parse-links"
          disabled={busyAction === "link"}
          onClick={parseLinks}
          type="button"
        >
          {busyAction === "link" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {busyAction === "link" ? "解析中" : "解析链接"}
        </button>
        <button
          className="mt-3 flex h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.82] bg-white/[0.58] text-sm font-black text-muted active:scale-[0.99]"
          data-testid="mobile-open-search"
          onClick={openSearchPage}
          type="button"
        >
          <ExternalLink className="h-4 w-4" />
          手动打开搜索页
        </button>
        {linkResult ? (
          <div className="mt-3 rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] px-4 py-3 text-xs leading-5 text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
            已解析 {linkResult.extracted_count} 个链接，可导入 {linkResult.accepted_count} 个。
          </div>
        ) : null}
      </MobilePanel>

      <MobilePanel title="采集来源">
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <CheckCircle2 className="h-4 w-4" />, label: "高赞榜单" },
            { icon: <PenLine className="h-4 w-4" />, label: "热门话题" },
            { icon: <UserRound className="h-4 w-4" />, label: "关注账号" },
            { icon: <ExternalLink className="h-4 w-4" />, label: "自定义链接" }
          ].map((item, index) => (
            <button
              className="flex min-h-[76px] touch-manipulation flex-col items-center justify-center gap-2 rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] text-[11px] font-black text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] active:scale-[0.98]"
              key={`collect-source-${index}-${item.label}`}
              onClick={() => onAction(`已选择采集来源：${item.label}`)}
              type="button"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[15px] bg-[#e7f2ea] text-moss">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </MobilePanel>

      <MobileReferenceTemplateList
        selectedTitle={selectedReference}
        onPreview={(item) => {
          setSelectedReference(item.title);
          setReferencePreview(item);
          onAction(`已打开参考预览：${item.title}`);
        }}
      />
      {referencePreview ? (
        <ReferencePreviewSheet
          reference={referencePreview}
          onClose={() => {
            setReferencePreview(null);
            onAction("已关闭参考预览。");
          }}
        />
      ) : null}
      {selectedTrendItem ? (
        <TrendSourceReviewSheet
          item={selectedTrendItem}
          onClose={() => {
            setSelectedTrendItem(null);
            onAction("已关闭采集素材详情。");
          }}
          onConfirm={() => confirmSingleTrendSource(selectedTrendItem)}
          onOpenUrl={() => openTrendSourceUrl(selectedTrendItem)}
          reviewed={reviewedTrendIdSet.has(selectedTrendItem.id)}
          selected={selectedTrendIdSet.has(selectedTrendItem.id)}
        />
      ) : null}
    </div>
  );
}
