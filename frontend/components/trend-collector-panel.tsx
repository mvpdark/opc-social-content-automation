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
  xiaohongshu: "Xiaohongshu",
  douyin: "Douyin"
};

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

export function TrendCollectorPanel() {
  const [platform, setPlatform] = useState<Platform>("xiaohongshu");
  const [keyword, setKeyword] = useState("硕升博");
  const [maxItems, setMaxItems] = useState(20);
  const [minDelay, setMinDelay] = useState(4);
  const [maxDelay, setMaxDelay] = useState(12);
  const [accessToken, setAccessToken] = useState("");
  const [sourcesReviewed, setSourcesReviewed] = useState(false);
  const [target, setTarget] = useState<SearchTarget | null>(null);
  const [statusText, setStatusText] = useState("Ready for public-first image-text collection.");
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
      setStatusText("Add a keyword before opening a platform search page.");
      return;
    }
    const fallbackTarget = buildLocalSearchTarget(platform, keyword);
    setTarget(fallbackTarget);
    const tab = window.open(fallbackTarget.search_url, "_blank", "noopener,noreferrer");
    setStatusText(`${platformLabels[platform]} search page opened for ${fallbackTarget.keyword}.`);
    setBusyAction("target");
    try {
      const nextTarget = await loadSearchTarget();
      if (tab) {
        tab.location.href = nextTarget.search_url;
      }
    } catch (error) {
      setStatusText(
        error instanceof Error
          ? `${platformLabels[platform]} search page opened; ${error.message}`
          : `${platformLabels[platform]} search page opened.`
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function createCollectionJob() {
    if (!canSubmit) {
      setStatusText("Add a keyword before queueing collection.");
      return;
    }
    setBusyAction("job");
    try {
      const response = await fetch(`${API_BASE}/trends/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
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
        throw new Error("Collection job needs an authenticated workspace session.");
      }
      const data = (await response.json()) as { id: number; status: string };
      setStatusText(`Collection job #${data.id} is ${data.status}.`);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Collection job failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function summarizeCollectedAssets() {
    if (!canSubmit) {
      setStatusText("Add a keyword before summarizing collected assets.");
      return;
    }
    if (!sourcesReviewed) {
      setStatusText("Review collected image-text sources before saving a knowledge digest.");
      return;
    }
    setBusyAction("digest");
    try {
      const response = await fetch(`${API_BASE}/trends/knowledge-digest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
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
        throw new Error("No matching collected assets are ready for knowledge digest.");
      }
      const data = (await response.json()) as { knowledge_id: number; item_count: number };
      setStatusText(
        `Knowledge item #${data.knowledge_id} created from ${data.item_count} collected assets.`
      );
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Knowledge digest failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="rounded-md border border-line bg-white shadow-soft">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold leading-6">Platform research</h2>
        <p className="text-sm text-slate-500">
          Visible browser collection for Xiaohongshu and Douyin source material.
        </p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-line xl:grid-cols-[1.1fr_0.9fr] xl:divide-x xl:divide-y-0">
        <div className="px-5 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Platform</span>
              <select
                className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none"
                value={platform}
                onChange={(event) => setPlatform(event.target.value as Platform)}
              >
                <option value="xiaohongshu">Xiaohongshu</option>
                <option value="douyin">Douyin</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-500">Keyword</span>
              <input
                className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="硕升博"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-500">Max items</span>
              <input
                className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none"
                max={100}
                min={1}
                type="number"
                value={maxItems}
                onChange={(event) => setMaxItems(Number(event.target.value))}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-500">Delay window</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  aria-label="Minimum delay seconds"
                  className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none"
                  max={60}
                  min={2}
                  type="number"
                  value={minDelay}
                  onChange={(event) => setMinDelay(Number(event.target.value))}
                />
                <input
                  aria-label="Maximum delay seconds"
                  className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none"
                  max={120}
                  min={3}
                  type="number"
                  value={maxDelay}
                  onChange={(event) => setMaxDelay(Number(event.target.value))}
                />
              </div>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-medium text-slate-500">Workspace access</span>
            <input
              className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none"
              onChange={(event) => setAccessToken(event.target.value)}
              placeholder="Bearer token for queued jobs and knowledge digest"
              type="password"
              value={accessToken}
            />
          </label>

          <label className="mt-4 flex items-start gap-3 rounded-md border border-line bg-paper px-3 py-3 text-sm">
            <input
              checked={sourcesReviewed}
              className="mt-1 h-4 w-4"
              onChange={(event) => setSourcesReviewed(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block font-medium text-ink">Sources reviewed</span>
              <span className="mt-1 block leading-5 text-slate-600">
                Confirm collected public image-text sources before saving a knowledge digest.
              </span>
            </span>
          </label>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white text-sm font-medium text-ink"
              disabled={busyAction !== null}
              onClick={openSearchPage}
              type="button"
            >
              {busyAction === "target" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Open page
            </button>
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-ink text-sm font-medium text-white"
              disabled={busyAction !== null}
              onClick={createCollectionJob}
              type="button"
            >
              {busyAction === "job" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Queue job
            </button>
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-paper text-sm font-medium text-ink"
              disabled={busyAction !== null}
              onClick={summarizeCollectedAssets}
              type="button"
            >
              {busyAction === "digest" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save digest
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-paper text-steel">
              <Search className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">Collection state</div>
              <p className="mt-1 text-sm leading-5 text-slate-600">{statusText}</p>
            </div>
          </div>

          <div className="mt-5 divide-y divide-line border-y border-line text-sm">
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-slate-500">Content kind</span>
              <span className="font-medium">
                {target?.content_kind === "image_text" ? "Image-text only" : "Not prepared"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-slate-500">Video collection</span>
              <span className="font-medium">
                {target?.video_collection_enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-slate-500">Target URL</span>
              <span className="min-w-0 truncate text-right font-medium">
                {target?.search_url ?? "Not prepared"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-slate-500">Login gate</span>
              <span className="font-medium">
                {target?.requires_manual_login === false ? "Public first" : "Operator required"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-slate-500">Automation</span>
              <span className="font-medium">
                {target?.automation_mode ?? "Visible browser"}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div className="border-l-4 border-moss pl-3">Public search runs before manual login.</div>
            <div className="border-l-4 border-steel pl-3">Collected assets are summarized after capture.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
