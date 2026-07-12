"use client";

import { memo, useCallback, type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  collectionJobDiagnosticItems,
  type CollectionJobDiagnosticItem,
  formatCollectionJobStatus,
  isActiveCollectionJob,
  isCollectionJobStatusSnapshot,
  isRestartableCollectionJob
} from "@/lib/collection-job-status";
import {
  ZSCJ_API_BASE,
  buildLocalSearchTarget,
  buildLocalXhsLinkImportTarget,
  platformLabels,
  isLinkImportTarget,
  isSearchTarget,
  isKnowledgeDigestResponse,
  type Platform,
  type SearchTarget,
  type LinkImportTarget,
  type TrendCollectionJob
} from "@/components/trend-collector-helpers";
import { TrendCollectorResults } from "@/components/trend-collector-results";
import { TrendCollectorStatus } from "@/components/trend-collector-status";
import { TrendCollectorForm } from "@/components/trend-collector-form";

export const TrendCollectorPanel = memo(function TrendCollectorPanel({
  onOpenSettings,
  workspaceToken
}: {
  onOpenSettings: () => void;
  workspaceToken: string;
}) {
  const [platform, setPlatform] = useState<Platform>("xiaohongshu");
  const [keyword, setKeyword] = useState("硕升博");
  const [maxItems, setMaxItems] = useState(20);
  const [minDelay, setMinDelay] = useState(4);
  const [maxDelay, setMaxDelay] = useState(12);
  const [sourcesReviewed, setSourcesReviewed] = useState(false);
  const [target, setTarget] = useState<SearchTarget | null>(null);
  const [linkImportText, setLinkImportText] = useState("");
  const [linkImportTarget, setLinkImportTarget] = useState<LinkImportTarget | null>(null);
  const [statusText, setStatusText] = useState("准备进行公开优先的图文采集。");
  const [diagnosticItems, setDiagnosticItems] = useState<CollectionJobDiagnosticItem[]>([]);
  const [busyAction, setBusyAction] = useState<"target" | "job" | "restart" | "digest" | "link" | null>(null);
  const busyActionRef = useRef(busyAction);
  busyActionRef.current = busyAction;
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [restartableJobId, setRestartableJobId] = useState<number | null>(null);
  const [restartableJobStatus, setRestartableJobStatus] = useState<string | null>(null);
  const linkImportRef = useRef<HTMLTextAreaElement | null>(null);
  const activeRef = useRef(true);
  const requestIdRef = useRef(0);
  const searchTargetAbortRef = useRef<AbortController | null>(null);
  const linkImportTimeoutRef = useRef<number | undefined>(undefined);
  const actionAbortControllersRef = useRef<Set<AbortController>>(new Set());

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      searchTargetAbortRef.current?.abort();
      actionAbortControllersRef.current.forEach((controller) => controller.abort());
      actionAbortControllersRef.current.clear();
      if (linkImportTimeoutRef.current !== undefined) {
        window.clearTimeout(linkImportTimeoutRef.current);
      }
    };
  }, []);

  const canSubmit = useMemo(() => keyword.trim().length > 0, [keyword]);
  const isPollingJob = activeJobId !== null;
  const canOpenSearch = canSubmit && busyAction === null;
  const canCreateJob = canSubmit && busyAction === null && !isPollingJob;
  const canRestartJob = restartableJobId !== null && busyAction === null && !isPollingJob;

  const handlePlatformChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const v = event.target.value;
    setPlatform(v === "douyin" ? "douyin" : "xiaohongshu");
  }, []);

  const handleKeywordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setKeyword(event.target.value);
  }, []);

  const handleMaxItemsChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    setMaxItems(Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 20);
  }, []);

  const handleMinDelayChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    setMinDelay(Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 1);
  }, []);

  const handleMaxDelayChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    setMaxDelay(Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 3);
  }, []);

  const handleSourcesReviewedChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSourcesReviewed(event.target.checked);
  }, []);

  const handleLinkImportTextChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setLinkImportText(event.target.value);
  }, []);

  const loadSearchTarget = useCallback(async (signal?: AbortSignal): Promise<SearchTarget> => {
    const requestId = ++requestIdRef.current;
    const params = new URLSearchParams({ platform, keyword: keyword.trim() });
    const response = await fetch(`${ZSCJ_API_BASE}/trends/search-target?${params.toString()}`, {
      headers: { ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {}) },
      signal
    });
    if (!response.ok) {
      throw new Error("搜索目标准备失败，请稍后重试或检查应用服务。");
    }
    const raw = await response.json();
    if (!isSearchTarget(raw)) {
      throw new Error("搜索目标数据格式异常。");
    }
    if (!activeRef.current || requestIdRef.current !== requestId) return raw;
    setTarget(raw);
    return raw;
  }, [platform, keyword, workspaceToken]);

  async function fetchCollectionJob(jobId: number, signal?: AbortSignal): Promise<TrendCollectionJob | null> {
    const response = await fetch(`${ZSCJ_API_BASE}/trends/jobs/${jobId}`, {
      headers: { ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {}) },
      signal
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error("无法刷新采集状态，请检查应用服务。");
    }
    const raw = await response.json();
    if (!isCollectionJobStatusSnapshot(raw)) {
      throw new Error("采集任务状态数据格式异常。");
    }
    return raw as TrendCollectionJob;
  }

  const fetchCollectionJobRef = useRef(fetchCollectionJob);
  fetchCollectionJobRef.current = fetchCollectionJob;

  const showCollectionJob = useCallback((job: TrendCollectionJob) => {
    setStatusText(formatCollectionJobStatus(job));
    setDiagnosticItems(collectionJobDiagnosticItems(job));
    if (isRestartableCollectionJob(job)) {
      setRestartableJobId(job.id);
      setRestartableJobStatus(job.status);
    } else {
      setRestartableJobId(null);
      setRestartableJobStatus(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function loadLatestJob() {
      try {
        const params = new URLSearchParams({ limit: "1" });
        const response = await fetch(`${ZSCJ_API_BASE}/trends/jobs?${params.toString()}`, {
          headers: { ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {}) },
          signal: ac.signal
        });
        if (!response.ok) {
          return;
        }
        const rawJobs = await response.json();
        if (!Array.isArray(rawJobs) || !rawJobs.every(isCollectionJobStatusSnapshot)) {
          return;
        }
        const jobs = rawJobs as TrendCollectionJob[];
        const latestJob = jobs[0];
        if (cancelled || !latestJob) {
          return;
        }
        showCollectionJob(latestJob);
        if (isActiveCollectionJob(latestJob)) {
          setActiveJobId(latestJob.id);
        }
      } catch {
        // The panel can still create a new job even if the latest status fetch fails.
      }
    }

    void loadLatestJob();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [workspaceToken, showCollectionJob]);

  useEffect(() => {
    if (activeJobId === null) {
      return undefined;
    }

    let cancelled = false;
    let timer: number | undefined;
    const abortController = new AbortController();
    const { signal } = abortController;

    async function pollJobStatus() {
      try {
        const job = await fetchCollectionJobRef.current(activeJobId as number, signal);
        if (cancelled) {
          return;
        }
        if (!job) {
          setStatusText("暂时查不到这次采集状态，请稍后刷新。");
          setDiagnosticItems([]);
          timer = window.setTimeout(pollJobStatus, 3000);
          return;
        }
        showCollectionJob(job);
        if (!isActiveCollectionJob(job)) {
          setActiveJobId(null);
          return;
        }
        timer = window.setTimeout(pollJobStatus, 3000);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setStatusText(error instanceof Error ? error.message : "采集状态刷新失败。");
        setDiagnosticItems([]);
        timer = window.setTimeout(pollJobStatus, 5000);
      }
    }

    timer = window.setTimeout(pollJobStatus, 800);

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
      abortController.abort();
    };
  }, [activeJobId]);

  const openSearchPage = useCallback(async () => {
    if (busyActionRef.current !== null) return;
    if (!canSubmit) {
      setStatusText("先填写关键词，再打开平台搜索页。");
      return;
    }
    const fallbackTarget = buildLocalSearchTarget(platform, keyword);
    setTarget(fallbackTarget);
    const tab = window.open(fallbackTarget.search_url, "_blank", "noopener,noreferrer");
    setStatusText(`已打开 ${platformLabels[platform]} 搜索页：${fallbackTarget.keyword}。`);
    setBusyAction("target");
    searchTargetAbortRef.current?.abort();
    const ac = new AbortController();
    searchTargetAbortRef.current = ac;
    try {
      const nextTarget = await loadSearchTarget(ac.signal);
      if (!activeRef.current) return;
      if (tab) {
        tab.location.href = nextTarget.search_url;
      }
    } catch (error) {
      if (!activeRef.current) return;
      setStatusText(
        error instanceof Error
          ? `${platformLabels[platform]} 搜索页已打开；${error.message}`
          : `${platformLabels[platform]} 搜索页已打开。`
      );
    } finally {
      if (activeRef.current) {
        setBusyAction(null);
      }
    }
  }, [canSubmit, platform, keyword, loadSearchTarget]);

  const createCollectionJob = useCallback(async () => {
    if (busyActionRef.current !== null) return;
    if (!canSubmit) {
      setStatusText("先填写关键词，再开始采集。");
      return;
    }
    setBusyAction("job");
    const ac = new AbortController();
    actionAbortControllersRef.current.add(ac);
    try {
      setTarget(buildLocalSearchTarget(platform, keyword));
      const response = await fetch(`${ZSCJ_API_BASE}/trends/jobs`, {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {})
        },
        body: JSON.stringify({
          platform,
          keyword: keyword.trim(),
          content_kind: "image_text",
          max_items: maxItems,
          min_delay_seconds: minDelay,
          max_delay_seconds: maxDelay,
          operator_wait_seconds: 30,
          session_label: platform,
          persist_session: true,
          persist_cookies: true
        })
      });
      if (!response.ok) {
        throw new Error("开始采集失败；如果已开启访问保护，请检查设置。");
      }
      const raw = await response.json();
      if (!isCollectionJobStatusSnapshot(raw)) {
        throw new Error("采集任务状态数据格式异常。");
      }
      const data = raw as TrendCollectionJob;
      if (!activeRef.current) return;
      setActiveJobId(data.id);
      showCollectionJob(data);
    } catch (error) {
      if (!activeRef.current) return;
      setStatusText(error instanceof Error ? error.message : "开始采集失败。");
      setDiagnosticItems([]);
    } finally {
      actionAbortControllersRef.current.delete(ac);
      if (activeRef.current) {
        setBusyAction(null);
      }
    }
  }, [canSubmit, platform, keyword, maxItems, minDelay, maxDelay, workspaceToken, showCollectionJob]);

  const startExistingJob = useCallback(async () => {
    if (busyActionRef.current !== null) return;
    if (restartableJobId === null) {
      setStatusText("没有可继续的上次采集。");
      return;
    }
    setBusyAction("restart");
    const ac = new AbortController();
    actionAbortControllersRef.current.add(ac);
    try {
      const response = await fetch(`${ZSCJ_API_BASE}/trends/jobs/${restartableJobId}/start`, {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {})
        }
      });
      if (!response.ok) {
        throw new Error("继续上次采集失败，请重新开始一次采集。");
      }
      const raw = await response.json();
      if (!isCollectionJobStatusSnapshot(raw)) {
        throw new Error("采集任务状态数据格式异常。");
      }
      const data = raw as TrendCollectionJob;
      if (!activeRef.current) return;
      setActiveJobId(data.id);
      showCollectionJob(data);
    } catch (error) {
      if (!activeRef.current) return;
      setStatusText(error instanceof Error ? error.message : "继续上次采集失败。");
      setDiagnosticItems([]);
    } finally {
      actionAbortControllersRef.current.delete(ac);
      if (activeRef.current) {
        setBusyAction(null);
      }
    }
  }, [restartableJobId, workspaceToken, showCollectionJob]);

  const focusLinkImportFallback = useCallback(() => {
    setPlatform("xiaohongshu");
    setStatusText("已切到小红书链接导入，粘贴分享文本或链接后点“解析链接”。");
    if (linkImportTimeoutRef.current !== undefined) {
      window.clearTimeout(linkImportTimeoutRef.current);
    }
    linkImportTimeoutRef.current = window.setTimeout(() => {
      linkImportRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      linkImportRef.current?.focus();
    }, 0);
  }, []);

  const parseXhsLinks = useCallback(async () => {
    if (busyActionRef.current !== null) return;
    if (platform !== "xiaohongshu") {
      setStatusText("链接导入器目前只支持小红书；抖音仍走公开搜索采集。");
      return;
    }
    if (!linkImportText.trim()) {
      setStatusText("先粘贴小红书分享文本或链接。");
      return;
    }
    setBusyAction("link");
    const ac = new AbortController();
    actionAbortControllersRef.current.add(ac);
    try {
      const fallbackTarget = buildLocalXhsLinkImportTarget(linkImportText);
      const response = await fetch(`${ZSCJ_API_BASE}/trends/link-import-target`, {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {})
        },
        body: JSON.stringify({
          raw_text: linkImportText,
          max_links: 10,
          download_media: false,
          persist_cookies: false
        })
      });
      if (!response.ok) {
        if (response.status === 404 && fallbackTarget.extracted_count > 0) {
          setLinkImportTarget(fallbackTarget);
          setStatusText(
            `链接导入服务还未加载，已先完成本地预解析：${fallbackTarget.accepted_count}/${fallbackTarget.extracted_count} 个链接可作为导入目标。`
          );
          return;
        }
        throw new Error(`链接解析服务返回 ${response.status}，请稍后重试或检查应用服务。`);
      }
      const raw: unknown = await response.json();
      if (!isLinkImportTarget(raw)) {
        throw new Error("链接解析服务返回的数据格式无效。");
      }
      const data = raw;
      if (!activeRef.current) return;
      setLinkImportTarget(data);
      setStatusText(
        `已解析 ${data.extracted_count} 个链接，其中 ${data.accepted_count} 个可作为小红书导入目标。`
      );
    } catch (error) {
      if (!activeRef.current) return;
      const fallbackTarget = buildLocalXhsLinkImportTarget(linkImportText);
      if (fallbackTarget.extracted_count > 0) {
        setLinkImportTarget(fallbackTarget);
        setStatusText(
          `暂时无法连接链接解析接口，已先完成本地预解析：${fallbackTarget.accepted_count}/${fallbackTarget.extracted_count} 个链接可作为导入目标。`
        );
      } else {
        setLinkImportTarget(null);
        setStatusText(error instanceof Error ? error.message : "链接解析失败。");
      }
    } finally {
      actionAbortControllersRef.current.delete(ac);
      if (activeRef.current) {
        setBusyAction(null);
      }
    }
  }, [platform, linkImportText, workspaceToken]);

  const summarizeCollectedAssets = useCallback(async () => {
    if (busyActionRef.current !== null) return;
    if (!canSubmit) {
      setStatusText("先填写关键词，再汇总采集素材。");
      return;
    }
    if (!sourcesReviewed) {
      setStatusText("保存知识摘要前，需要先确认已人工看过图文来源。");
      return;
    }
    setBusyAction("digest");
    const ac = new AbortController();
    actionAbortControllersRef.current.add(ac);
    try {
      const response = await fetch(`${ZSCJ_API_BASE}/trends/knowledge-digest`, {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {})
        },
        body: JSON.stringify({
          platform,
          keyword: keyword.trim(),
          limit: maxItems,
          category: "trend-insight",
          source_reviewed: true
        })
      });
      if (!response.ok) {
        throw new Error("还没有可用于知识摘要的匹配素材。");
      }
      const raw = await response.json();
      if (!isKnowledgeDigestResponse(raw)) throw new Error("知识摘要数据格式异常。");
      const data = raw;
      if (!activeRef.current) return;
      setStatusText(
        `知识条目 #${data.knowledge_id} 已由 ${data.item_count} 条素材生成。可继续采集下一批，也可以去知识库查看摘要。`
      );
    } catch (error) {
      if (!activeRef.current) return;
      setStatusText(error instanceof Error ? error.message : "知识摘要生成失败。");
    } finally {
      actionAbortControllersRef.current.delete(ac);
      if (activeRef.current) {
        setBusyAction(null);
      }
    }
  }, [canSubmit, sourcesReviewed, platform, keyword, maxItems, workspaceToken]);

  return (
    <section className="workspace-panel workspace-trend-console glass-panel overflow-hidden rounded-md border shadow-panel">
      <div className="workspace-panel-header flex flex-col gap-2 border-b border-line/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold leading-5">平台研究采集</h2>
          <p className="mt-1 text-xs text-muted">
          公开优先、图文限定、人工确认后再入知识库。
          </p>
        </div>
        <span className="rounded-md border border-moss/30 bg-moss/10 px-2 py-1 text-xs font-medium text-ink">
          可连续采集
        </span>
      </div>

      <div className="workspace-panel-body grid grid-cols-1 divide-y divide-line xl:grid-cols-[380px_minmax(0,1fr)] xl:divide-x xl:divide-y-0">
        <TrendCollectorForm
          busyAction={busyAction}
          isPollingJob={isPollingJob}
          keyword={keyword}
          linkImportTarget={linkImportTarget}
          linkImportText={linkImportText}
          maxDelay={maxDelay}
          maxItems={maxItems}
          minDelay={minDelay}
          onKeywordChange={handleKeywordChange}
          onLinkImportTextChange={handleLinkImportTextChange}
          onMaxDelayChange={handleMaxDelayChange}
          onMaxItemsChange={handleMaxItemsChange}
          onMinDelayChange={handleMinDelayChange}
          onOpenSearchPage={openSearchPage}
          onOpenSettings={onOpenSettings}
          onParseLinks={parseXhsLinks}
          onPlatformChange={handlePlatformChange}
          onSourcesReviewedChange={handleSourcesReviewedChange}
          onSummarizeCollectedAssets={summarizeCollectedAssets}
          onCreateCollectionJob={createCollectionJob}
          platform={platform}
          sourcesReviewed={sourcesReviewed}
          textAreaRef={linkImportRef}
          workspaceToken={workspaceToken}
        />

        <TrendCollectorStatus
          busyAction={busyAction}
          canRestartJob={canRestartJob}
          diagnosticItems={diagnosticItems}
          hasRestartableJob={restartableJobId !== null}
          isPollingJob={isPollingJob}
          onFocusLinkImportFallback={focusLinkImportFallback}
          onStartExistingJob={startExistingJob}
          restartableJobStatus={restartableJobStatus}
          statusText={statusText}
          target={target}
        />
      </div>
      <TrendCollectorResults
        busyAction={busyAction}
        canCreateJob={canCreateJob}
        canOpenSearch={canOpenSearch}
        isPollingJob={isPollingJob}
        maxItems={maxItems}
        onOpenSearchPage={openSearchPage}
        onCreateCollectionJob={createCollectionJob}
        sourcesReviewed={sourcesReviewed}
      />
    </section>
  );
});
