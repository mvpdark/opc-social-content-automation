"use client";

import { ExternalLink, Loader2, Play, Save, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { PlatformLabel } from "@/components/platform-icon";

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

type LinkCandidate = {
  original_url: string;
  normalized_url: string;
  link_type: string;
  accepted: boolean;
  requires_resolution: boolean;
  note_id: string | null;
  reason: string | null;
};

type LinkImportTarget = {
  platform: "xiaohongshu";
  extracted_count: number;
  accepted_count: number;
  import_mode: string;
  download_media_enabled: boolean;
  cookie_persistence: boolean;
  links: LinkCandidate[];
  safety_notes: string[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8010/api";
const XHS_URL_PATTERN = /https?:\/\/[^\s<>'"，。；、)）】]+/gi;
const SUPPORTED_XHS_HOSTS = new Set([
  "xiaohongshu.com",
  "www.xiaohongshu.com",
  "xhslink.com",
  "www.xhslink.com"
]);
const TRAILING_URL_PUNCTUATION = ".,;:!?，。；：！？、)]）】\"'";

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
  "flex h-10 items-center justify-center gap-2 rounded-md bg-ink text-sm font-medium text-paper disabled:cursor-not-allowed disabled:opacity-60";

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

function cleanImportUrl(url: string) {
  let cleaned = url.trim();
  while (cleaned && TRAILING_URL_PUNCTUATION.includes(cleaned[cleaned.length - 1] ?? "")) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}

function buildLocalXhsLinkCandidate(rawUrl: string): LinkCandidate {
  const originalUrl = cleanImportUrl(rawUrl);

  try {
    const parsed = new URL(originalUrl);
    const host = parsed.hostname.toLowerCase();
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (!SUPPORTED_XHS_HOSTS.has(host)) {
      return {
        original_url: originalUrl,
        normalized_url: originalUrl,
        link_type: "unsupported",
        accepted: false,
        requires_resolution: false,
        note_id: null,
        reason: "只接受 xiaohongshu.com 和 xhslink.com 链接。"
      };
    }

    if (host === "xhslink.com" || host === "www.xhslink.com") {
      if (!parts.length) {
        return {
          original_url: originalUrl,
          normalized_url: originalUrl,
          link_type: "short_link",
          accepted: false,
          requires_resolution: false,
          note_id: null,
          reason: "短链需要包含分享码。"
        };
      }
      return {
        original_url: originalUrl,
        normalized_url: originalUrl,
        link_type: "short_link",
        accepted: true,
        requires_resolution: true,
        note_id: null,
        reason: "短链需要后续由授权采集器解析详情。"
      };
    }

    if (parts.length >= 2 && parts[0] === "explore") {
      return {
        original_url: originalUrl,
        normalized_url: `https://www.xiaohongshu.com/explore/${parts[1]}`,
        link_type: "note_detail",
        accepted: true,
        requires_resolution: false,
        note_id: parts[1],
        reason: null
      };
    }

    if (parts.length >= 3 && parts[0] === "discovery" && parts[1] === "item") {
      return {
        original_url: originalUrl,
        normalized_url: `https://www.xiaohongshu.com/discovery/item/${parts[2]}`,
        link_type: "note_detail",
        accepted: true,
        requires_resolution: false,
        note_id: parts[2],
        reason: null
      };
    }

    if (parts.length >= 2 && parts[0] === "user" && parts[1] === "profile") {
      const userId = parts[2];
      const noteId = parts[3] ?? null;
      if (!userId) {
        return {
          original_url: originalUrl,
          normalized_url: originalUrl,
          link_type: "profile",
          accepted: false,
          requires_resolution: false,
          note_id: null,
          reason: "主页链接需要包含用户 ID。"
        };
      }
      const normalizedPath = noteId ? `user/profile/${userId}/${noteId}` : `user/profile/${userId}`;
      return {
        original_url: originalUrl,
        normalized_url: `https://www.xiaohongshu.com/${normalizedPath}`,
        link_type: noteId ? "profile_note" : "profile",
        accepted: true,
        requires_resolution: false,
        note_id: noteId,
        reason: noteId ? null : "主页链接需要后续进入笔记列表采集。"
      };
    }

    if (parts[0] === "search_result") {
      return {
        original_url: originalUrl,
        normalized_url: "https://www.xiaohongshu.com/search_result",
        link_type: "search_result",
        accepted: true,
        requires_resolution: false,
        note_id: null,
        reason: "搜索结果页可作为上下文，但不是单篇笔记。"
      };
    }

    return {
      original_url: originalUrl,
      normalized_url: originalUrl,
      link_type: "xiaohongshu_other",
      accepted: false,
      requires_resolution: false,
      note_id: null,
      reason: "暂不支持这种小红书链接形态。"
    };
  } catch {
    return {
      original_url: originalUrl,
      normalized_url: originalUrl,
      link_type: "invalid",
      accepted: false,
      requires_resolution: false,
      note_id: null,
      reason: "链接格式无法识别。"
    };
  }
}

function buildLocalXhsLinkImportTarget(rawText: string): LinkImportTarget {
  const rawUrls = Array.from(rawText.matchAll(XHS_URL_PATTERN), (match) => cleanImportUrl(match[0]));
  const dedupedUrls = Array.from(new Set(rawUrls)).slice(0, 10);
  const links = dedupedUrls.map(buildLocalXhsLinkCandidate);

  return {
    platform: "xiaohongshu",
    extracted_count: links.length,
    accepted_count: links.filter((link) => link.accepted).length,
    import_mode: "frontend_preparse_only",
    download_media_enabled: false,
    cookie_persistence: false,
    links,
    safety_notes: [
      "本地预解析只识别链接形态，不抓取小红书页面内容。",
      "后续入库前仍需人工确认来源和内容。"
    ]
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
  const [linkImportText, setLinkImportText] = useState("");
  const [linkImportTarget, setLinkImportTarget] = useState<LinkImportTarget | null>(null);
  const [statusText, setStatusText] = useState("准备进行公开优先的图文采集。");
  const [busyAction, setBusyAction] = useState<"target" | "job" | "digest" | "link" | null>(null);

  const canSubmit = useMemo(() => keyword.trim().length > 0, [keyword]);
  const canOpenSearch = canSubmit && busyAction === null;
  const canCreateJob = canSubmit && busyAction === null;
  const canSaveDigest = canSubmit && sourcesReviewed && busyAction === null;
  const canParseLinks =
    platform === "xiaohongshu" && linkImportText.trim().length > 0 && busyAction === null;
  const openSearchLabel = canSubmit ? "打开搜索" : "先填关键词";
  const createJobLabel = !canSubmit
    ? "先填关键词"
    : "创建任务";
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
    ? "先填写关键词，再创建采集任务"
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
          persist_cookies: false
        })
      });
      if (!response.ok) {
        throw new Error("采集任务创建失败；如果已恢复正式登录，请检查登录令牌。");
      }
      const data = (await response.json()) as { id: number; status: string };
      setStatusText(`采集任务 #${data.id} 当前状态：${data.status}。`);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "采集任务创建失败。");
    } finally {
      setBusyAction(null);
    }
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
            `后端链接导入接口还未加载，已先完成本地预解析：${fallbackTarget.accepted_count}/${fallbackTarget.extracted_count} 个链接可作为导入目标。`
          );
          return;
        }
        throw new Error(`链接解析接口返回 ${response.status}，请稍后重试或检查后端服务。`);
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
            <div className={fieldLabelClass}>登录门控</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-ink">
                {workspaceToken ? "令牌已配置" : "策划师测试模式免令牌"}
              </span>
              <button
                aria-label="打开设置查看登录令牌"
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
              ) : (
                <Play className="h-4 w-4" />
              )}
              {busyAction === "job" ? "正在创建" : createJobLabel}
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
                clean-room
              </span>
            </div>
            <textarea
              className="glass-control mt-3 min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm leading-6 text-ink outline-none"
              onChange={(event) => setLinkImportText(event.target.value)}
              placeholder="粘贴小红书分享文本、https://www.xiaohongshu.com/explore/... 或 https://xhslink.com/..."
              value={linkImportText}
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-muted">
                短链只会标记为“待授权解析”，不会在这里绕过登录或风控。
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
                    linkImportTarget.links.map((item) => (
                      <div className="px-3 py-2 text-xs" key={item.original_url}>
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
              <span className="text-muted">Cookie 保存</span>
              <span className="font-medium text-moss">默认关闭</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-muted">自动化模式</span>
              <span className="font-medium">
                {target?.automation_mode ?? "可见浏览器"}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div className="border-l-4 border-moss pl-3">先试公开搜索，人工登录只作兜底。</div>
            <div className="border-l-4 border-steel pl-3">采集素材先确认，再进入知识摘要。</div>
          </div>
        </div>
      </div>
    </section>
  );
}
