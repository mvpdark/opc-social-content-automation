"use client";

import { memo, type ChangeEvent, type RefObject } from "react";
import { ExternalLink, Loader2, Play, Save } from "lucide-react";

import { PlatformLabel } from "@/components/platform-icon";
import {
  fieldLabelClass,
  inputClass,
  inlineInputClass,
  primaryButtonClass,
  secondaryButtonClass,
  type LinkImportTarget,
  type Platform
} from "@/components/trend-collector-helpers";
import { TrendCollectorLinkImporter } from "@/components/trend-collector-link-importer";

type BusyAction = "target" | "job" | "restart" | "digest" | "link" | null;

interface TrendCollectorFormProps {
  platform: Platform;
  keyword: string;
  maxItems: number;
  minDelay: number;
  maxDelay: number;
  workspaceToken: string;
  onOpenSettings: () => void;
  sourcesReviewed: boolean;
  onPlatformChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onKeywordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMaxItemsChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMinDelayChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMaxDelayChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSourcesReviewedChange: (event: ChangeEvent<HTMLInputElement>) => void;
  busyAction: BusyAction;
  isPollingJob: boolean;
  onOpenSearchPage: () => void;
  onCreateCollectionJob: () => void;
  onSummarizeCollectedAssets: () => void;
  linkImportTarget: LinkImportTarget | null;
  linkImportText: string;
  onLinkImportTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onParseLinks: () => void;
  textAreaRef: RefObject<HTMLTextAreaElement | null>;
}

export const TrendCollectorForm = memo(function TrendCollectorForm({
  platform,
  keyword,
  maxItems,
  minDelay,
  maxDelay,
  workspaceToken,
  onOpenSettings,
  sourcesReviewed,
  onPlatformChange,
  onKeywordChange,
  onMaxItemsChange,
  onMinDelayChange,
  onMaxDelayChange,
  onSourcesReviewedChange,
  busyAction,
  isPollingJob,
  onOpenSearchPage,
  onCreateCollectionJob,
  onSummarizeCollectedAssets,
  linkImportTarget,
  linkImportText,
  onLinkImportTextChange,
  onParseLinks,
  textAreaRef
}: TrendCollectorFormProps) {
  const canSubmit = keyword.trim().length > 0;
  const canOpenSearch = canSubmit && busyAction === null;
  const canCreateJob = canSubmit && busyAction === null && !isPollingJob;
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

  return (
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
            onChange={onPlatformChange}
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
            onChange={onKeywordChange}
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
            onChange={onMaxItemsChange}
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
                onChange={onMinDelayChange}
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
                onChange={onMaxDelayChange}
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
          onChange={onSourcesReviewedChange}
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
          onClick={onOpenSearchPage}
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
          onClick={onCreateCollectionJob}
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
          onClick={onSummarizeCollectedAssets}
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

      <TrendCollectorLinkImporter
        busyAction={busyAction}
        canParseLinks={canParseLinks}
        linkImportTarget={linkImportTarget}
        linkImportText={linkImportText}
        onLinkImportTextChange={onLinkImportTextChange}
        onParseLinks={onParseLinks}
        parseLinksLabel={parseLinksLabel}
        textAreaRef={textAreaRef}
      />
    </div>
  );
});
