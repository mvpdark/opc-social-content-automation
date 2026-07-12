"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { sampleReferences, type SampleReference } from "@/components/mobile-reference-templates";
import { mobilePlatformText, sanitizeMobileTrendItems, type MobileTrendContent } from "@/components/mobile-trend-source-review";
import {
  collectionJobDiagnosticItems,
  type CollectionJobDiagnosticItem,
  formatCollectionJobStatus,
  isCollectionJobStatusSnapshot
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
import { getZscjApiBase } from "@/lib/api-base";
import { useCollectionJobPolling } from "@/lib/use-collection-job-polling";

import {
  formatScheduleTime,
  isKnowledgeDigestResponse,
  isLinkImportTarget,
  isPartialCollectionScheduleStorage,
  type CollectionScheduleStorage,
  type LinkImportTarget,
  type MobileCollectionJob
} from "@/components/mobile-collect-utils";
import { useTrendReviewQueue } from "@/lib/use-trend-review-queue";
import { CollectHeroSection } from "@/components/mobile-collect-hero";
import { CollectSourceAndReferences } from "@/components/mobile-collect-source-references";
import { CollectScheduleSettings } from "@/components/mobile-collect-schedule-settings";
import { CollectResultConfirmation } from "@/components/mobile-collect-result-confirmation";
import { CollectManualPanel } from "@/components/mobile-collect-manual-panel";

export const CollectScreen = memo(function CollectScreen({
  active = true,
  credentials,
  onAction
}: {
  active?: boolean;
  credentials: CredentialSettings;
  onAction: (message: string) => void;
}) {
  const apiBase = useMemo(() => getZscjApiBase(), []);
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
  const { reviewedTrendIds, setReviewedTrendIds, dismissedTrendIds, setDismissedTrendIds } =
    useTrendReviewQueue(platform, query);
  const [deletingTrendIds, setDeletingTrendIds] = useState<number[]>([]);
  const [selectedTrendItem, setSelectedTrendItem] = useState<MobileTrendContent | null>(null);
  const [trendListLoading, setTrendListLoading] = useState(false);
  const [trendListStatus, setTrendListStatus] = useState("正在读取采集素材...");
  const [linkText, setLinkText] = useState("");
  const [linkResult, setLinkResult] = useState<LinkImportTarget | null>(null);
  const [selectedReference, setSelectedReference] = useState<string>(sampleReferences[0].title);
  const [referencePreview, setReferencePreview] = useState<SampleReference | null>(null);
  const [busyAction, setBusyAction] = useState<"digest" | "job" | "link" | "search" | null>(null);
  const busyActionRef = useRef(busyAction);
  busyActionRef.current = busyAction;
  const scheduleRunningRef = useRef(false);
  const hydratedRef = useRef(false);
  const trendItemsReadyRef = useRef(false);
  const activeRef = useRef(true);
  const requestIdRef = useRef(0);
  const deleteAbortRef = useRef<AbortController | null>(null);
  const saveDigestAbortRef = useRef<AbortController | null>(null);
  const parseLinksAbortRef = useRef<AbortController | null>(null);
  const manualJobAbortRef = useRef<AbortController | null>(null);
  const collectedMetricValue = useMemo(
    () => diagnosticItems.find((item) => item.label === "已采集")?.value ?? "0",
    [diagnosticItems]
  );
  const selectedTrendIdSet = useMemo(() => new Set(selectedTrendIds), [selectedTrendIds]);
  const reviewedTrendIdSet = useMemo(() => new Set(reviewedTrendIds), [reviewedTrendIds]);
  const dismissedTrendIdSet = useMemo(() => new Set(dismissedTrendIds), [dismissedTrendIds]);
  const deletingTrendIdSet = useMemo(() => new Set(deletingTrendIds), [deletingTrendIds]);
  const pendingTrendItems = useMemo(
    () =>
      trendItems.filter(
        (item) => !reviewedTrendIdSet.has(item.id) && !dismissedTrendIdSet.has(item.id)
      ),
    [trendItems, reviewedTrendIdSet, dismissedTrendIdSet]
  );
  const pendingTrendIdSet = useMemo(
    () => new Set(pendingTrendItems.map((item) => item.id)),
    [pendingTrendItems]
  );
  const deletingTrendIdsRef = useRef(deletingTrendIds);
  deletingTrendIdsRef.current = deletingTrendIds;
  const pendingTrendIdSetRef = useRef(pendingTrendIdSet);
  pendingTrendIdSetRef.current = pendingTrendIdSet;
  const selectedPendingCount = useMemo(
    () => selectedTrendIds.filter((id) => pendingTrendIdSet.has(id)).length,
    [selectedTrendIds, pendingTrendIdSet]
  );
  const allPendingSelected = useMemo(
    () =>
      pendingTrendItems.length > 0 &&
      pendingTrendItems.every((item) => selectedTrendIdSet.has(item.id)),
    [pendingTrendItems, selectedTrendIdSet]
  );
  const diagnosticSummary = useMemo(
    () => diagnosticItems.map((item) => `${item.label}${item.value}`).join(" "),
    [diagnosticItems]
  );
  const visibleDiagnosticItems = useMemo(() => diagnosticItems.slice(0, 8), [diagnosticItems]);
  const sourceReviewed = reviewedTrendIds.length > 0;
  const collectionBusy = busyAction !== null || activeCollectionJobId !== null;

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      deleteAbortRef.current?.abort();
      saveDigestAbortRef.current?.abort();
      parseLinksAbortRef.current?.abort();
      manualJobAbortRef.current?.abort();
    };
  }, []);

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
      const parsed = JSON.parse(stored);
      if (!isPartialCollectionScheduleStorage(parsed)) {
        setScheduleMessage("定时采集配置格式异常，请重新保存。");
        return;
      }
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
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
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
    const ac = new AbortController();
    const timer = window.setInterval(() => {
      if (!autoEnabled || !nextRunAt || scheduleRunningRef.current) {
        return;
      }
      if (Date.now() < new Date(nextRunAt).getTime()) {
        return;
      }
      void runCollectionJobRef.current("schedule", ac.signal);
    }, 10000);
    return () => {
      window.clearInterval(timer);
      ac.abort();
    };
  }, [autoEnabled, nextRunAt]);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();
    (async () => {
      try {
        await loadTrendItemsRef.current(false, abortController.signal);
      } catch (err) {
        if (!cancelled) {
          if (process.env.NODE_ENV === "development") console.warn("loadTrendItems effect failed", err);
        }
      }
    })();
    return () => {
      cancelled = true;
      abortController.abort();
    };
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

  const scheduleNextRun = useCallback((fromDate = new Date()) => {
    const safeInterval = Number.isFinite(intervalMinutes) ? Math.max(5, intervalMinutes) : 60;
    const nextDate = new Date(fromDate.getTime() + safeInterval * 60_000);
    setNextRunAt(nextDate.toISOString());
    return nextDate;
  }, [intervalMinutes]);

  const fetchLatestCollectionJob = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`${apiBase}/trends/jobs?limit=1`, {
      headers: authHeaders(credentials),
      signal
    });
    if (!response.ok) {
      throw new Error(await readApiError(response, "最近采集状态读取失败。"));
    }
    const rawJobs: unknown = await response.json();
    if (!Array.isArray(rawJobs) || !rawJobs.every(isCollectionJobStatusSnapshot)) {
      throw new Error("采集任务列表数据格式异常。");
    }
    const jobs = rawJobs as MobileCollectionJob[];
    return jobs[0] ?? null;
  }, [apiBase, credentials]);
  const fetchLatestCollectionJobRef = useRef(fetchLatestCollectionJob);
  fetchLatestCollectionJobRef.current = fetchLatestCollectionJob;

  const fetchCollectionJobStatus = useCallback(async (jobId: number, signal?: AbortSignal) => {
    const response = await fetch(`${apiBase}/trends/jobs/${jobId}`, {
      headers: authHeaders(credentials),
      signal
    });
    if (!response.ok) {
      throw new Error(await readApiError(response, "采集状态刷新失败。"));
    }
    const raw: unknown = await response.json();
    if (!isCollectionJobStatusSnapshot(raw)) {
      throw new Error("采集任务状态数据格式异常。");
    }
    return raw as MobileCollectionJob;
  }, [apiBase, credentials]);
  const fetchCollectionJobStatusRef = useRef(fetchCollectionJobStatus);
  fetchCollectionJobStatusRef.current = fetchCollectionJobStatus;

  const loadTrendItems = useCallback(async (announce = false, signal?: AbortSignal) => {
    const requestId = ++requestIdRef.current;
    const limit = Math.min(100, Math.max(20, maxItems));
    const params = new URLSearchParams({
      limit: String(limit),
      platform
    });
    setTrendListLoading(true);
    setTrendListStatus("正在读取采集素材...");
    try {
      const response = await fetch(`${apiBase}/trends/list?${params.toString()}`, {
        headers: authHeaders(credentials),
        signal
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "采集素材读取失败。"));
      }
      const items = sanitizeMobileTrendItems(await response.json());
      if (!activeRef.current || requestIdRef.current !== requestId) return;
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
      if (!activeRef.current || requestIdRef.current !== requestId) return;
      trendItemsReadyRef.current = false;
      setTrendItems([]);
      setTrendListStatus(message);
      if (announce) {
        onAction(message);
      }
    } finally {
      if (!activeRef.current || requestIdRef.current !== requestId) return;
      setTrendListLoading(false);
    }
  }, [apiBase, credentials, maxItems, platform, onAction]);
  const loadTrendItemsRef = useRef(loadTrendItems);
  loadTrendItemsRef.current = loadTrendItems;

  useCollectionJobPolling({
    lastJobId,
    activeCollectionJobId,
    workspaceToken: credentials.workspaceToken,
    onAction,
    fetchLatestCollectionJobRef,
    fetchCollectionJobStatusRef,
    loadTrendItemsRef,
    setLastJobId,
    setLastRunAt,
    setScheduleMessage,
    setDiagnosticItems,
    setActiveCollectionJobId
  });

  const saveSchedule = useCallback(() => {
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
  }, [query, autoEnabled, onAction, scheduleNextRun]);

  const openSearchPage = useCallback(async () => {
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
  }, [query, platform, onAction]);

  const runCollectionJob = useCallback(async (source: "manual" | "schedule", signal?: AbortSignal) => {
    if (busyActionRef.current !== null) return;
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
        signal,
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
      const raw: unknown = await response.json();
      if (!isCollectionJobStatusSnapshot(raw)) {
        throw new Error("采集任务状态数据格式异常。");
      }
      const data = raw as MobileCollectionJob;
      if (!activeRef.current) return;
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
      if (!activeRef.current) return;
      const nextDate = autoEnabled ? scheduleNextRun(startedAt) : null;
      const message = error instanceof Error ? error.message : "开始采集失败。";
      setScheduleMessage(
        `${runLabel}失败：${message}${nextDate ? ` 下次重试：${formatScheduleTime(nextDate.toISOString())}。` : ""}`
      );
      setDiagnosticItems([]);
      onAction(message);
    } finally {
      scheduleRunningRef.current = false;
      if (!activeRef.current) return;
      setBusyAction(null);
    }
  }, [query, platform, maxItems, apiBase, credentials, autoEnabled, onAction, scheduleNextRun]);
  const runCollectionJobRef = useRef(runCollectionJob);
  runCollectionJobRef.current = runCollectionJob;

  const parseLinks = useCallback(async () => {
    if (busyActionRef.current !== null) return;
    if (platform !== "xiaohongshu") {
      onAction("链接导入当前只支持小红书；抖音请用关键词采集。");
      return;
    }
    if (!linkText.trim()) {
      onAction("先粘贴小红书分享文本或链接。");
      return;
    }

    parseLinksAbortRef.current?.abort();
    const controller = new AbortController();
    parseLinksAbortRef.current = controller;
    setBusyAction("link");
    onAction("正在解析小红书链接。");
    try {
      const response = await fetch(`${apiBase}/trends/link-import-target`, {
        method: "POST",
        headers: authHeaders(credentials),
        signal: controller.signal,
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
      const raw: unknown = await response.json();
      if (!activeRef.current) return;
      if (!isLinkImportTarget(raw)) {
        throw new Error("链接解析服务返回的数据格式无效。");
      }
      const data = raw;
      setLinkResult(data);
      onAction(`已解析 ${data.extracted_count} 个链接，可导入 ${data.accepted_count} 个。`);
    } catch (error) {
      if (!activeRef.current) return;
      if (error instanceof Error && error.name === "AbortError") return;
      onAction(error instanceof Error ? error.message : "链接解析失败。");
    } finally {
      if (activeRef.current) {
        setBusyAction(null);
      }
    }
  }, [platform, linkText, apiBase, onAction, credentials]);

  const toggleTrendSelection = useCallback((itemId: number) => {
    if (!pendingTrendIdSetRef.current.has(itemId)) {
      return;
    }
    setSelectedTrendIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((id) => id !== itemId)
        : [...currentIds, itemId]
    );
  }, []);

  const selectVisibleTrendItems = useCallback(() => {
    if (!pendingTrendItems.length) {
      onAction("当前没有可选素材，请先运行采集。");
      return;
    }
    setSelectedTrendIds(pendingTrendItems.map((item) => item.id));
    onAction(`已选中 ${pendingTrendItems.length} 条待确认素材，请继续人工确认。`);
  }, [pendingTrendItems, onAction]);

  const clearTrendSelection = useCallback(() => {
    setSelectedTrendIds([]);
    onAction("已清空已选采集素材。");
  }, [onAction]);

  const confirmSelectedTrendSources = useCallback(() => {
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
  }, [selectedTrendIds, pendingTrendIdSet, onAction]);

  const confirmSingleTrendSource = useCallback((item: MobileTrendContent) => {
    setSelectedTrendIds((currentIds) => currentIds.filter((id) => id !== item.id));
    setReviewedTrendIds((currentIds) =>
      currentIds.includes(item.id) ? currentIds : [...currentIds, item.id]
    );
    setSelectedTrendItem(null);
    onAction(`已确认来源：${item.title}。可保存摘要，也可以继续采集下一批。`);
  }, [onAction]);

  const deleteTrendSource = useCallback(async (item: MobileTrendContent) => {
    if (deletingTrendIdsRef.current.includes(item.id)) {
      return;
    }
    setDeletingTrendIds((currentIds) => [...currentIds, item.id]);
    onAction(`正在删除采集素材：${item.title}`);
    deleteAbortRef.current?.abort();
    const deleteController = new AbortController();
    deleteAbortRef.current = deleteController;
    try {
      const response = await fetch(`${apiBase}/trends/${item.id}`, {
        headers: authHeaders(credentials),
        method: "DELETE",
        signal: deleteController.signal
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "采集素材删除失败。"));
      }
      if (!activeRef.current) return;
      setTrendItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id));
      setSelectedTrendIds((currentIds) => currentIds.filter((id) => id !== item.id));
      setReviewedTrendIds((currentIds) => currentIds.filter((id) => id !== item.id));
      setDismissedTrendIds((currentIds) => currentIds.filter((id) => id !== item.id));
      setSelectedTrendItem((currentItem) => (currentItem?.id === item.id ? null : currentItem));
      onAction(`已删除采集素材：${item.title}`);
    } catch (error) {
      if (!activeRef.current) return;
      if (error instanceof Error && error.name === "AbortError") return;
      onAction(error instanceof Error ? error.message : "采集素材删除失败。");
    } finally {
      if (!activeRef.current) return;
      setDeletingTrendIds((currentIds) => currentIds.filter((id) => id !== item.id));
    }
  }, [apiBase, credentials, onAction]);

  const openTrendSourceUrl = useCallback((item: MobileTrendContent) => {
    if (!item.url) {
      onAction("这条素材没有来源链接。");
      return;
    }
    window.open(item.url, "_blank", "noopener,noreferrer");
    onAction("已打开采集来源链接。");
  }, [onAction]);

  const handleOpenTrendItem = useCallback((item: MobileTrendContent) => {
    setSelectedTrendItem(item);
    onAction("已打开采集素材详情。");
  }, [onAction]);

  const saveKnowledgeDigest = useCallback(async () => {
    if (busyActionRef.current !== null) return;
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
    saveDigestAbortRef.current?.abort();
    const saveDigestController = new AbortController();
    saveDigestAbortRef.current = saveDigestController;
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
        }),
        signal: saveDigestController.signal
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "知识摘要生成失败。"));
      }
      const data = await response.json();
      if (!isKnowledgeDigestResponse(data)) {
        throw new Error("知识摘要生成失败：服务响应异常。");
      }
      if (!activeRef.current) return;
      const savedTrendIds = [...reviewedTrendIds];
      setDismissedTrendIds((currentIds) => Array.from(new Set([...currentIds, ...savedTrendIds])));
      setSelectedTrendIds([]);
      setReviewedTrendIds([]);
      setSelectedTrendItem((currentItem) =>
        currentItem && savedTrendIds.includes(currentItem.id) ? null : currentItem
      );
      onAction(`知识条目 #${data.knowledge_id} 已生成，来源素材 ${data.item_count} 条。`);
    } catch (error) {
      if (!activeRef.current) return;
      if (error instanceof Error && error.name === "AbortError") return;
      onAction(error instanceof Error ? error.message : "知识摘要生成失败。");
    } finally {
      if (activeRef.current) {
        setBusyAction(null);
      }
    }
  }, [query, reviewedTrendIds, sourceReviewed, platform, apiBase, credentials, onAction]);

  const handlePreviewReference = useCallback((item: SampleReference) => {
    setSelectedReference(item.title);
    setReferencePreview(item);
    onAction(`已打开参考预览：${item.title}`);
  }, [onAction]);

  const handleCloseReferencePreview = useCallback(() => {
    setReferencePreview(null);
    onAction("已关闭参考预览。");
  }, [onAction]);

  const handleCloseTrendReview = useCallback(() => {
    setSelectedTrendItem(null);
    onAction("已关闭采集素材详情。");
  }, [onAction]);

  const handleConfirmTrendReview = useCallback(() => {
    if (selectedTrendItem) {
      confirmSingleTrendSource(selectedTrendItem);
    }
  }, [confirmSingleTrendSource, selectedTrendItem]);

  const handleOpenTrendReviewUrl = useCallback(() => {
    if (selectedTrendItem) {
      openTrendSourceUrl(selectedTrendItem);
    }
  }, [openTrendSourceUrl, selectedTrendItem]);

  const handleViewScheduleDetails = useCallback(() => {
    onAction("定时采集任务详情已展开，可以继续修改周期和来源。");
  }, [onAction]);

  const handleClearQuery = useCallback(() => {
    setQuery("");
  }, []);

  const handleAutoEnabledChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setAutoEnabled(event.target.checked);
  }, []);

  const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const handleMaxItemsChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    setMaxItems(Number.isFinite(nextValue) ? nextValue : 20);
  }, []);

  const handleIntervalMinutesChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    setIntervalMinutes(Number.isFinite(nextValue) ? nextValue : 60);
  }, []);

  const handleLinkTextChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setLinkText(event.target.value);
  }, []);

  const handleSelectXiaohongshu = useCallback(() => {
    setPlatform("xiaohongshu");
    onAction("已切换到小红书图文采集。");
  }, [onAction]);

  const handleSelectDouyin = useCallback(() => {
    setPlatform("douyin");
    onAction("已切换到抖音图文采集。");
  }, [onAction]);

  const handleRunManualCollection = useCallback(() => {
    manualJobAbortRef.current?.abort();
    const controller = new AbortController();
    manualJobAbortRef.current = controller;
    void runCollectionJob("manual", controller.signal);
  }, [runCollectionJob]);

  const handleRefreshTrendItems = useCallback(() => {
    void loadTrendItems(true);
  }, [loadTrendItems]);

  const handleSelectCollectSource = useCallback((label: string) => {
    onAction(`已选择采集来源：${label}`);
  }, [onAction]);

  return (
    <div className="-mt-1 space-y-3 pb-8">
      <CollectHeroSection
        autoEnabled={autoEnabled}
        collectedMetricValue={collectedMetricValue}
        intervalMinutes={intervalMinutes}
        maxItems={maxItems}
        nextRunAt={nextRunAt}
        onViewScheduleDetails={handleViewScheduleDetails}
      />

      <CollectScheduleSettings
        autoEnabled={autoEnabled}
        busyAction={busyAction}
        diagnosticItems={diagnosticItems}
        diagnosticSummary={diagnosticSummary}
        intervalMinutes={intervalMinutes}
        lastRunAt={lastRunAt}
        maxItems={maxItems}
        nextRunAt={nextRunAt}
        onAutoEnabledChange={handleAutoEnabledChange}
        onClearQuery={handleClearQuery}
        onIntervalMinutesChange={handleIntervalMinutesChange}
        onMaxItemsChange={handleMaxItemsChange}
        onQueryChange={handleQueryChange}
        onRunManualCollection={handleRunManualCollection}
        onSaveSchedule={saveSchedule}
        onSelectDouyin={handleSelectDouyin}
        onSelectXiaohongshu={handleSelectXiaohongshu}
        platform={platform}
        query={query}
        scheduleMessage={scheduleMessage}
        visibleDiagnosticItems={visibleDiagnosticItems}
      />

      <CollectResultConfirmation
        activeCollectionJobId={activeCollectionJobId}
        allPendingSelected={allPendingSelected}
        busyAction={busyAction}
        collectionBusy={collectionBusy}
        deletingTrendIdSet={deletingTrendIdSet}
        onClearSelection={clearTrendSelection}
        onConfirmSelected={confirmSelectedTrendSources}
        onConfirmSingle={confirmSingleTrendSource}
        onDelete={deleteTrendSource}
        onOpen={handleOpenTrendItem}
        onOpenUrl={openTrendSourceUrl}
        onRefresh={handleRefreshTrendItems}
        onRunManualCollection={handleRunManualCollection}
        onSaveDigest={saveKnowledgeDigest}
        onSelectAll={selectVisibleTrendItems}
        onToggle={toggleTrendSelection}
        pendingTrendItems={pendingTrendItems}
        reviewedTrendIdSet={reviewedTrendIdSet}
        reviewedTrendIds={reviewedTrendIds}
        selectedPendingCount={selectedPendingCount}
        selectedTrendIdSet={selectedTrendIdSet}
        selectedTrendIds={selectedTrendIds}
        sourceReviewed={sourceReviewed}
        trendListLoading={trendListLoading}
        trendListStatus={trendListStatus}
      />

      <CollectManualPanel
        busyAction={busyAction}
        linkResult={linkResult}
        linkText={linkText}
        onLinkTextChange={handleLinkTextChange}
        onOpenSearchPage={openSearchPage}
        onParseLinks={parseLinks}
      />

      <CollectSourceAndReferences
        onCloseReferencePreview={handleCloseReferencePreview}
        onCloseTrendReview={handleCloseTrendReview}
        onConfirmTrendReview={handleConfirmTrendReview}
        onOpenTrendReviewUrl={handleOpenTrendReviewUrl}
        onPreviewReference={handlePreviewReference}
        onSelectCollectSource={handleSelectCollectSource}
        referencePreview={referencePreview}
        reviewedTrendIdSet={reviewedTrendIdSet}
        selectedReference={selectedReference}
        selectedTrendIdSet={selectedTrendIdSet}
        selectedTrendItem={selectedTrendItem}
      />
    </div>
  );
});
