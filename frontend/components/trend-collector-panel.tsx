"use client";

import { ExternalLink, Loader2, Play, Save, Search } from "lucide-react";
import { useMemo, useState } from "react";

type Platform = "xiaohongshu" | "douyin";

type SearchTarget = {
  platform: Platform;
  keyword: string;
  content_kind: "image_text" | "video" | "mixed";
  video_collection_enabled: boolean;
  search_url: string;
  requires_manual_login: boolean;
  automation_mode: string;
  safety_notes: string[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

const platformLabels: Record<Platform, string> = {
  xiaohongshu: "小红书",
  douyin: "抖音"
};

const fieldLabelClass = "text-xs font-medium text-muted";
const inputClass =
  "glass-control mt-2 h-10 w-full rounded-md border px-3 text-sm text-ink outline-none";
const inlineInputClass =
  "glass-control h-10 w-full rounded-md border px-3 text-sm text-ink outline-none";
const secondaryButtonClass =
  "glass-control flex h-10 items-center justify-center gap-2 rounded-md border text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-60";
const primaryButtonClass =
  "flex h-10 items-center justify-center gap-2 rounded-md bg-ink text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60";

function buildLocalSearchTarget(platform: Platform, keyword: string): SearchTarget {
  const encodedKeyword = encodeURIComponent(keyword.trim());
  return {
    platform,
    keyword: keyword.trim(),
    content_kind: "image_text",
    video_collection_enabled: false,
    search_url:
      platform === "xiaohongshu"
        ? `https://www.xiaohongshu.com/search_result?keyword=${encodedKeyword}`
        : `https://www.douyin.com/search/${encodedKeyword}`,
    requires_manual_login: false,
    automation_mode: "public_first_visible_browser",
    safety_notes: []
  };
}

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
  const [statusText, setStatusText] = useState("准备进行公开优先的图文采集。");
  const [busyAction, setBusyAction] = useState<"target" | "job" | "digest" | null>(null);

  const canSubmit = useMemo(() => keyword.trim().length > 0, [keyword]);

  async function loadSearchTarget(): Promise<SearchTarget> {
    const params = new URLSearchParams({ platform, keyword: keyword.trim() });
    const response = await fetch(`${API_BASE}/trends/search-target?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Search target could not be prepared.");
    }
    const nextTarget = (await response.json()) as SearchTarget;
    setTarget(nextTarget);
    return nextTarget;
  }

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
      setStatusText("先填写关键词，再创建采集任务。");
      return;
    }
    if (!workspaceToken.trim()) {
      setStatusText("先到设置里填写工作台令牌，再创建采集任务。");
      return;
    }
    setBusyAction("job");
    try {
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
          persist_session: true,
          persist_cookies: true
        })
      });
      if (!response.ok) {
        throw new Error("创建采集任务需要有效的工作台登录令牌。");
      }
      const data = (await response.json()) as { id: number; status: string };
      setStatusText(`采集任务 #${data.id} 当前状态：${data.status}。`);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "采集任务创建失败。");
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
    if (!workspaceToken.trim()) {
      setStatusText("先到设置里填写工作台令牌，再保存知识摘要。");
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
        `知识条目 #${data.knowledge_id} 已由 ${data.item_count} 条素材生成。`
      );
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "知识摘要生成失败。");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="glass-panel rounded-md border">
      <div className="border-b border-line/70 px-4 py-3">
        <h2 className="text-sm font-semibold leading-5">平台研究采集</h2>
        <p className="text-xs text-muted">
          公开优先、图文限定、人工确认后再入知识库。
        </p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-line xl:grid-cols-[1.1fr_0.9fr] xl:divide-x xl:divide-y-0">
        <div className="px-4 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className={fieldLabelClass}>平台</span>
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

            <label className="block">
              <span className={fieldLabelClass}>采集间隔</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  aria-label="Minimum delay seconds"
                  className={inlineInputClass}
                  max={60}
                  min={2}
                  type="number"
                  value={minDelay}
                  onChange={(event) => setMinDelay(Number(event.target.value))}
                />
                <input
                  aria-label="Maximum delay seconds"
                  className={inlineInputClass}
                  max={120}
                  min={3}
                  type="number"
                  value={maxDelay}
                  onChange={(event) => setMaxDelay(Number(event.target.value))}
                />
              </div>
            </label>
          </div>

          <div className="glass-subtle mt-3 rounded-md border px-3 py-3">
            <div className={fieldLabelClass}>工作台令牌</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-ink">
                {workspaceToken ? "已在设置中配置" : "未配置"}
              </span>
              <button
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

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            <button
              className={secondaryButtonClass}
              disabled={busyAction !== null}
              onClick={openSearchPage}
              type="button"
            >
              {busyAction === "target" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              打开搜索
            </button>
            <button
              className={primaryButtonClass}
              disabled={busyAction !== null}
              onClick={createCollectionJob}
              type="button"
            >
              {busyAction === "job" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              创建任务
            </button>
            <button
              className={secondaryButtonClass}
              disabled={busyAction !== null}
              onClick={summarizeCollectedAssets}
              type="button"
            >
              {busyAction === "digest" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              保存摘要
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="glass-subtle flex h-10 w-10 items-center justify-center rounded-md border text-steel">
              <Search className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">采集状态</div>
              <p className="mt-1 text-sm leading-5 text-muted">{statusText}</p>
            </div>
          </div>

          <div className="mt-5 divide-y divide-line border-y border-line text-sm">
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-muted">内容类型</span>
              <span className="font-medium">
                {target?.content_kind === "image_text" ? "仅图文" : "未准备"}
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
                {target?.search_url ?? "未准备"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-muted">登录门槛</span>
              <span className="font-medium">
                {target?.requires_manual_login === false ? "公开优先" : "需人工处理"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-muted">自动化模式</span>
              <span className="font-medium">
                {target?.automation_mode ?? "可见浏览器"}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div className="border-l-4 border-moss pl-3">先试公开搜索，再考虑人工登录。</div>
            <div className="border-l-4 border-steel pl-3">采集素材先审核，再进入知识摘要。</div>
          </div>
        </div>
      </div>
    </section>
  );
}
