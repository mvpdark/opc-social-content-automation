"use client";

import { ExternalLink, Loader2, Play, Save, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { PlatformLabel } from "@/components/platform-icon";
import {
  collectionJobDiagnosticItems,
  type CollectionJobDiagnosticItem,
  formatCollectionJobStatus,
  isActiveCollectionJob,
  isRestartableCollectionJob
} from "@/lib/collection-job-status";
import {
  API_BASE,
  buildLocalSearchTarget,
  buildLocalXhsLinkImportTarget,
  diagnosticToneClass,
  fieldLabelClass,
  inputClass,
  inlineInputClass,
  platformLabels,
  primaryButtonClass,
  restartCollectionJobLabel,
  secondaryButtonClass,
  type Platform,
  type SearchTarget,
  type LinkImportTarget,
  type TrendCollectionJob
} from "@/components/trend-collector-helpers";

export function TrendCollectorPanel({
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
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [restartableJobId, setRestartableJobId] = useState<number | null>(null);
  const [restartableJobStatus, setRestartableJobStatus] = useState<string | null>(null);
  const linkImportRef = useRef<HTMLTextAreaElement | null>(null);

  const canSubmit = useMemo(() => keyword.trim().length > 0, [keyword]);
  const isPollingJob = activeJobId !== null;
  const canOpenSearch = canSubmit && busyAction === null;
  const canCreateJob = canSubmit && busyAction === null && !isPollingJob;
  const canRestartJob = restartableJobId !== null && busyAction === null && !isPollingJob;
  const canSaveDigest = canSubmit && sourcesReviewed && busyAction === null;
  const canParseLinks =
    platform === "xiaohongshu" && linkImportText.trim().length > 0 && busyAction === null;
  const openSearchLabel = canSubmit ? "打开搜索" : "先填关键词";
  const createJobLabel = !canSubmit
    ? "先填关键词"
    : isPollingJob
      ? "采集中"
      : sourcesReviewed
        ? "继续采集下一批"
        : "开始采集";
  const saveDigestLabel = !canSubmit
    ? "先填关键词"
    : !sourcesReviewed
      ? "先确认来源"
      : "保存摘要";
  const parseLinksLabel =
    platform !== "xiaohongshu"
      ? "仅小红书"
      : linkImportText.trim()
        ? "解析链接"
        : "先粘贴链接";
  const openSearchTitle = canSubmit ? undefined : "先填写关键词，再打开公开搜索页";
  const createJobTitle = !canSubmit
    ? "先填写关键词，再开始采集"
    : undefined;
  const saveDigestTitle = !canSubmit
    ? "先填写关键词，再保存知识摘要"
    : !sourcesReviewed
      ? "保存摘要前需要人工确认来源"
      : undefined;

  async function loadSearchTarget(): Promise<SearchTarget> {
    const params = new URLSearchParams({ platform, keyword: keyword.trim() });
    const response = await fetch(`${API_BASE}/trends/search-target?${params.toString()}`);
    if (!response.ok) {
      throw new Error("搜索目标准备失败，请稍后重试或检查应用服务。");
    }
    const nextTarget = (await response.json()) as SearchTarget;
    setTarget(nextTarget);
    return nextTarget;
  }

  async function fetchCollectionJob(jobId: number): Promise<TrendCollectionJob | null> {
    const response = await fetch(`${API_BASE}/trends/jobs/${jobId}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error("无法刷新采集状态，请检查应用服务。");
    }
    return (await response.json()) as TrendCollectionJob;
  }

  function showCollectionJob(job: TrendCollectionJob) {
    setStatusText(formatCollectionJobStatus(job));
    setDiagnosticItems(collectionJobDiagnosticItems(job));
    if (isRestartableCollectionJob(job)) {
      setRestartableJobId(job.id);
      setRestartableJobStatus(job.status);
    } else {
      setRestartableJobId(null);
      setRestartableJobStatus(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadLatestJob() {
      try {
        const params = new URLSearchParams({ limit: "1" });
        const response = await fetch(`${API_BASE}/trends/jobs?${params.toString()}`);
        if (!response.ok) {
          return;
        }
        const jobs = (await response.json()) as TrendCollectionJob[];
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
    };
  }, []);

  useEffect(() => {
    if (activeJobId === null) {
      return undefined;
    }

    let cancelled = false;
    let timer: number | undefined;

    async function pollJobStatus() {
      try {
        const job = await fetchCollectionJob(activeJobId as number);
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
    };
  }, [activeJobId]);

  async function openSearchPage() {
    if (!canSubmit) {
      setStatusText("先填写关键词，再打开平台搜索页。");
      return;
    }
    const fallbackTarget = buildLocalSearchTarget(platform, keyword);
    setTarget(fallbackTarget);
    const tab = window.open(fallbackTarget.search_url, "_blank", "noopener,noreferrer");
    setStatusText(`已打开 ${platformLabels[platform]} 搜索页：${fallbackTarget.keyword}。`);
    setBusyAction("target");
    try {
      const nextTarget = await loadSearchTarget();
      if (tab) {
        tab.location.href = nextTarget.search_url;
      }
    } catch (error) {
      setStatusText(
        error instanceof Error
          ? `${platformLabels[platform]} 搜索页已打开；${error.message}`
          : `${platformLabels[platform]} 搜索页已打开。`
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function createCollectionJob() {
    if (!canSubmit) {
      setStatusText("先填写关键词，再开始采集。");
      return;
    }
    setBusyAction("job");
    try {
      setTarget(buildLocalSearchTarget(platform, keyword));
      const response = await fetch(`${API_BASE}/trends/jobs`, {
        method: "POST",
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
      const data = (await response.json()) as TrendCollectionJob;
      setActiveJobId(data.id);
      showCollectionJob(data);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "开始采集失败。");
      setDiagnosticItems([]);
    } finally {
      setBusyAction(null);
    }
  }

  async function startExistingJob() {
    if (restartableJobId === null) {
      setStatusText("没有可继续的上次采集。");
      return;
    }
    setBusyAction("restart");
    try {
      const response = await fetch(`${API_BASE}/trends/jobs/${restartableJobId}/start`, {
        method: "POST",
        headers: {
          ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {})
        }
      });
      if (!response.ok) {
        throw new Error("继续上次采集失败，请重新开始一次采集。");
      }
      const data = (await response.json()) as TrendCollectionJob;
      setActiveJobId(data.id);
      showCollectionJob(data);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "继续上次采集失败。");
      setDiagnosticItems([]);
    } finally {
      setBusyAction(null);
    }
  }

  function focusLinkImportFallback() {
    setPlatform("xiaohongshu");
    setStatusText("已切到小红书链接导入，粘贴分享文本或链接后点“解析链接”。");
    window.setTimeout(() => {
      linkImportRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      linkImportRef.current?.focus();
    }, 0);
  }

  async function parseXhsLinks() {
    if (platform !== "xiaohongshu") {
      setStatusText("链接导入器目前只支持小红书；抖音仍走公开搜索采集。");
      return;
    }
    if (!linkImportText.trim()) {
      setStatusText("先粘贴小红书分享文本或链接。");
      return;
    }
    setBusyAction("link");
    try {
      const fallbackTarget = buildLocalXhsLinkImportTarget(linkImportText);
      const response = await fetch(`${API_BASE}/trends/link-import-target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const data = (await response.json()) as LinkImportTarget;
      setLinkImportTarget(data);
      setStatusText(
        `已解析 ${data.extracted_count} 个链接，其中 ${data.accepted_count} 个可作为小红书导入目标。`
      );
    } catch (error) {
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
      setBusyAction(null);
    }
  }

  async function summarizeCollectedAssets() {
    if (!canSubmit) {
      setStatusText("先填写关键词，再汇总采集素材。");
      return;
    }
    if (!sourcesReviewed) {
      setStatusText("保存知识摘要前，需要先确认已人工看过图文来源。");
      return;
    }
    setBusyAction("digest");
    try {
      const response = await fetch(`${API_BASE}/trends/knowledge-digest`, {
        method: "POST",
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
      const data = (await response.json()) as { knowledge_id: number; item_count: number };
      setStatusText(
        `知识条目 #${data.knowledge_id} 已由 ${data.item_count} 条素材生成。可继续采集下一批，也可以去知识库查看摘要。`
      );
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "知识摘要生成失败。");
    } finally {
      setBusyAction(null);
    }
  }

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
        <div className="workspace-trend-controls px-4 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="flex items-center justify-between gap-3">
                <span className={fieldLabelClass}>平台</span>
                <PlatformLabel
                  className="text-xs font-semibold text-ink"
                  iconSize="sm"
                  platform={platform}
                />
              </span>
              <select
                className={inputClass}
                value={platform}
                onChange={(event) => setPlatform(event.target.value as Platform)}
              >
                <option value="xiaohongshu">小红书</option>
                <option value="douyin">抖音</option>
              </select>
            </label>

            <label className="block">
              <span className={fieldLabelClass}>关键词</span>
              <input
                className={inputClass}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="硕升博"
              />
            </label>

            <label className="block">
              <span className={fieldLabelClass}>最大条数</span>
              <input
                className={inputClass}
                max={100}
                min={1}
                type="number"
                value={maxItems}
                onChange={(event) => setMaxItems(Number(event.target.value))}
              />
            </label>

            <div className="block">
              <span className={fieldLabelClass}>采集间隔</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted">最短（秒）</span>
                  <input
                    aria-label="最短采集间隔（秒）"
                    className={inlineInputClass}
                    max={60}
                    min={2}
                    type="number"
                    value={minDelay}
                    onChange={(event) => setMinDelay(Number(event.target.value))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted">最长（秒）</span>
                  <input
                    aria-label="最长采集间隔（秒）"
                    className={inlineInputClass}
                    max={120}
                    min={3}
                    type="number"
                    value={maxDelay}
                    onChange={(event) => setMaxDelay(Number(event.target.value))}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="glass-subtle mt-3 rounded-md border px-3 py-3">
            <div className={fieldLabelClass}>访问保护</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-ink">
                {workspaceToken ? "访问保护已开启" : "未开启"}
              </span>
              <button
                aria-label="打开设置查看访问保护"
                className="glass-control rounded-md border px-2 py-1 text-xs font-medium text-ink"
                onClick={onOpenSettings}
                type="button"
              >
                打开设置
              </button>
            </div>
          </div>

          <label className="glass-subtle mt-3 flex items-start gap-3 rounded-md border px-3 py-3 text-sm">
            <input
              checked={sourcesReviewed}
              className="mt-1 h-4 w-4"
              onChange={(event) => setSourcesReviewed(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block font-medium text-ink">来源已人工确认</span>
              <span className="mt-1 block leading-5 text-muted">
                保存知识摘要前，需要确认采集来源是真实公开图文。
              </span>
            </span>
          </label>

          {sourcesReviewed ? (
            <div className="mt-3 rounded-md border border-moss/35 bg-moss/10 px-3 py-2 text-xs leading-5 text-ink">
              本批来源已人工确认：现在可以保存知识摘要；需要补素材时，直接点击“继续采集下一批”，不会自动发布任何内容。
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            <button
              aria-label={openSearchLabel}
              className={secondaryButtonClass}
              disabled={!canOpenSearch}
              onClick={openSearchPage}
              title={openSearchTitle}
              type="button"
            >
              {busyAction === "target" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {busyAction === "target" ? "正在打开" : openSearchLabel}
            </button>
            <button
              aria-label={createJobLabel}
              className={primaryButtonClass}
              disabled={!canCreateJob}
              onClick={createCollectionJob}
              title={createJobTitle}
              type="button"
            >
              {busyAction === "job" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPollingJob ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {busyAction === "job" ? "正在开始" : createJobLabel}
            </button>
            <button
              aria-label={saveDigestLabel}
              className={secondaryButtonClass}
              disabled={!canSaveDigest}
              onClick={summarizeCollectedAssets}
              title={saveDigestTitle}
              type="button"
            >
              {busyAction === "digest" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {busyAction === "digest" ? "正在保存" : saveDigestLabel}
            </button>
          </div>

          <div className="glass-subtle mt-4 rounded-md border p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold">小红书链接导入器</div>
                <p className="mt-1 text-xs leading-5 text-muted">
                  参考 XHS-Downloader 的“粘贴分享链接”入口，但这里先只解析链接，不下载、不抓取详情。
                </p>
              </div>
              <span className="rounded-md border border-line bg-mist px-2 py-1 text-xs font-medium text-muted">
                安全解析
              </span>
            </div>
            <textarea
              className="glass-control mt-3 min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm leading-6 text-ink outline-none"
              onChange={(event) => setLinkImportText(event.target.value)}
              placeholder="粘贴小红书分享文本、https://www.xiaohongshu.com/explore/... 或 https://xhslink.com/..."
              ref={linkImportRef}
              value={linkImportText}
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-muted">
                短链只会标记为“待授权解析”，不会在这里绕过登录或平台限制。
              </p>
              <button
                className={`${secondaryButtonClass} px-3`}
                disabled={!canParseLinks}
                onClick={parseXhsLinks}
                type="button"
              >
                {busyAction === "link" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {busyAction === "link" ? "正在解析" : parseLinksLabel}
              </button>
            </div>
            {linkImportTarget ? (
              <div className="mt-3 rounded-md border border-line bg-paper/65">
                <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 text-xs">
                  <span className="font-medium text-ink">
                    可导入 {linkImportTarget.accepted_count}/{linkImportTarget.extracted_count}
                  </span>
                  <span className="text-muted">
                    下载媒体：{linkImportTarget.download_media_enabled ? "启用" : "禁用"}
                  </span>
                </div>
                <div className="max-h-44 divide-y divide-line overflow-auto">
                  {linkImportTarget.links.length ? (
                    linkImportTarget.links.map((item, index) => (
                      <div className="px-3 py-2 text-xs" key={`import-link-${index}-${item.original_url}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-ink">{item.link_type}</span>
                          <span className={item.accepted ? "text-moss" : "text-coral"}>
                            {item.accepted ? "可导入" : "暂不支持"}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-muted">{item.normalized_url}</div>
                        {item.reason ? (
                          <div className="mt-1 text-muted">{item.reason}</div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-xs text-muted">
                      没有识别到可解析链接。
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="workspace-trend-status px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="glass-subtle flex h-10 w-10 items-center justify-center rounded-md border text-steel">
              <Search className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">采集状态</div>
              <p className="mt-1 text-sm leading-5 text-muted">{statusText}</p>
              {diagnosticItems.length ? (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="collection-diagnostic-grid">
                  {diagnosticItems.map((item, index) => (
                    <div
                      className={`rounded-md border px-3 py-2 text-xs ${diagnosticToneClass(item.tone)}`}
                      data-tone={item.tone}
                      key={`collector-diagnostic-${index}-${item.label}-${item.value}`}
                    >
                      <div className="text-muted">{item.label}</div>
                      <div className="mt-1 truncate font-semibold text-ink">{item.value}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              {restartableJobId !== null ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    className={`${secondaryButtonClass} px-3`}
                    disabled={!canRestartJob}
                    onClick={startExistingJob}
                    type="button"
                  >
                    {busyAction === "restart" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {busyAction === "restart" ? "正在启动" : restartCollectionJobLabel(restartableJobStatus)}
                  </button>
                  <button
                    className={`${secondaryButtonClass} px-3`}
                    disabled={busyAction !== null || isPollingJob}
                    onClick={focusLinkImportFallback}
                    type="button"
                  >
                    <Search className="h-4 w-4" />
                    改用链接导入
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-5 divide-y divide-line border-y border-line text-sm">
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-muted">内容类型</span>
              <span className="font-medium">
                {target?.content_kind === "image_text" ? "仅图文" : "待打开搜索"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-muted">视频采集</span>
              <span className="font-medium">
                {target?.video_collection_enabled ? "已启用" : "已禁用"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-muted">目标链接</span>
              <span className="min-w-0 truncate text-right font-medium">
                {target?.search_url ?? "先打开搜索生成"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-muted">访问方式</span>
              <span className="font-medium">
                {target?.requires_manual_login === false ? "公开优先" : "需人工处理"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-muted">登录状态保存</span>
              <span className="font-medium text-moss">固定会话保存</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-muted">采集方式</span>
              <span className="font-medium">
                {target?.automation_mode ?? "采集浏览器"}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div className="border-l-4 border-moss pl-3">先试公开搜索，人工登录只作兜底。</div>
            <div className="border-l-4 border-steel pl-3">采集素材先确认，再进入知识摘要。</div>
          </div>
        </div>
      </div>
      <div className="workspace-trend-results border-t border-line/70 px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-ink">采集结果确认</h3>
              <span className="rounded-md border border-line bg-mist px-2 py-1 text-xs font-medium text-muted">
                真实素材表格
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">
              采集完成后在这里逐条核对标题、作者、封面、互动数据、正文和来源链接；没有真实返回时不会填充假样本。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className={`${secondaryButtonClass} px-3`}
              disabled={!canOpenSearch}
              onClick={openSearchPage}
              type="button"
            >
              <ExternalLink className="h-4 w-4" />
              打开来源页
            </button>
            <button
              className={primaryButtonClass}
              disabled={!canCreateJob}
              onClick={createCollectionJob}
              type="button"
            >
              {busyAction === "job" || isPollingJob ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              继续采集下一批
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-md border border-line/70">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold text-muted">
                  <th className="px-3 py-3">内容信息</th>
                  <th className="px-3 py-3">作者</th>
                  <th className="px-3 py-3">封面</th>
                  <th className="px-3 py-3">互动数据</th>
                  <th className="px-3 py-3">正文</th>
                  <th className="px-3 py-3">来源链接</th>
                  <th className="px-3 py-3">状态</th>
                  <th className="px-3 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-paper/50">
                  <td className="px-3 py-5 text-sm font-medium text-ink" colSpan={8}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <span>
                        当前前端尚未收到可渲染的素材明细。运行采集并返回真实结果后，这里会按参考图展示逐条确认表格。
                      </span>
                      <span className="text-xs font-normal text-muted">
                        计划采集：{maxItems} 条 · 来源确认：{sourcesReviewed ? "已勾选" : "待勾选"}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
