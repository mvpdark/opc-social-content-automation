"use client";

import { memo, type ChangeEvent } from "react";
import { RotateCcw } from "lucide-react";
import { PlatformLabel, type PlatformId } from "@/components/platform-icon";
import {
  expressionOptions,
  formControlClass,
  subtleCardClass,
  writingStylePresets,
  type ExpressionOptionKey,
  type WritingStylePresetId
} from "./workspace-utils";
import { Pill } from "./workspace-ui";
import { type GenerationTopicPreset } from "@/lib/topic-presets";

interface GenerationFormFieldsProps {
  platform: string;
  onPlatformChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  workspaceToken: string;
  onOpenSettings: () => void;
  topic: string;
  onTopicChange: (event: ChangeEvent<HTMLInputElement>) => void;
  visibleTopicPresets: GenerationTopicPreset[];
  selectedTopicPresetKey: string | undefined;
  onApplyTopicPreset: (preset: GenerationTopicPreset) => void;
  onRefreshTopicPresets: () => void;
  knowledgeQuery: string;
  onKnowledgeQueryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  targetAudience: string;
  onTargetAudienceChange: (event: ChangeEvent<HTMLInputElement>) => void;
  coverDirectionPreviewLabel: string;
  coverDirectionPreview: string;
  stylePreset: WritingStylePresetId;
  onApplyStylePreset: (preset: WritingStylePresetId) => void;
  styleOptions: Record<ExpressionOptionKey, boolean>;
  onToggleStyleOption: (optionKey: ExpressionOptionKey) => void;
  tone: string;
  onToneChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  tagsText: string;
  onTagsTextChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const GenerationFormFields = memo(function GenerationFormFields({
  platform,
  onPlatformChange,
  workspaceToken,
  onOpenSettings,
  topic,
  onTopicChange,
  visibleTopicPresets,
  selectedTopicPresetKey,
  onApplyTopicPreset,
  onRefreshTopicPresets,
  knowledgeQuery,
  onKnowledgeQueryChange,
  targetAudience,
  onTargetAudienceChange,
  coverDirectionPreviewLabel,
  coverDirectionPreview,
  stylePreset,
  onApplyStylePreset,
  styleOptions,
  onToggleStyleOption,
  tone,
  onToneChange,
  tagsText,
  onTagsTextChange
}: GenerationFormFieldsProps) {
  const selectedPlatform: PlatformId = platform === "douyin" ? "douyin" : "xiaohongshu";
  return (
<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
  <label className="block">
    <span className="flex items-center justify-between gap-3 text-xs font-medium text-muted">
      <span>平台</span>
      <PlatformLabel
        className="font-semibold text-ink"
        iconSize="sm"
        platform={selectedPlatform}
        suffix="图文"
      />
    </span>
    <select
      className={`${formControlClass} h-10`}
      value={platform}
      onChange={onPlatformChange}
    >
      <option value="xiaohongshu">小红书图文</option>
      <option value="douyin">抖音图文</option>
    </select>
  </label>
  <div className={`${subtleCardClass} px-3 py-2`}>
    <div className="text-xs font-medium text-muted">访问保护</div>
    <div className="mt-1 flex items-center justify-between gap-3">
      <span className="text-sm font-medium">
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
  <label className="block md:col-span-2">
    <span className="text-xs font-medium text-muted">选题</span>
    <input
      className={`${formControlClass} h-10`}
      data-testid="content-topic"
      onChange={onTopicChange}
      placeholder="输入要生成的图文主题"
      value={topic}
    />
  </label>
  <div className="md:col-span-2" data-testid="topic-preset-list">
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-muted">推荐选题</span>
      <button
        className="flex h-8 items-center gap-1 rounded-md border border-line bg-paper/70 px-2 text-[11px] font-semibold text-moss transition hover:border-moss/60 hover:bg-moss/10"
        data-testid="topic-preset-refresh"
        onClick={onRefreshTopicPresets}
        type="button"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        换一批
      </button>
    </div>
    <div className="mt-1 text-[11px] text-muted">每 45 秒自动换一批，也可以直接修改为自定义选题</div>
    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
      {visibleTopicPresets.map((preset) => {
        const selected = selectedTopicPresetKey === preset.key;
        return (
          <button
            aria-pressed={selected}
            className={[
              "min-h-[94px] rounded-[16px] border px-3 py-2.5 text-left transition hover:translate-y-[-1px]",
              selected
                ? "border-moss/70 bg-moss/10 shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.44)]"
                : "border-steel/35 bg-paper/70 hover:border-moss/60 hover:bg-moss/10"
            ].join(" ")}
            data-testid={`topic-preset-${preset.key}`}
            key={preset.key}
            onClick={() => onApplyTopicPreset(preset)}
            type="button"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-moss">
                {preset.desktopLabel}
              </span>
              {selected ? (
                <span className="rounded-full bg-moss/15 px-2 py-0.5 text-[10px] font-semibold text-moss">
                  当前
                </span>
              ) : null}
            </span>
            <span className="mt-1 block text-sm font-semibold leading-5 text-ink">
              {preset.topic}
            </span>
            <span className="mt-1 block text-[11px] leading-4 text-muted">
              {preset.desktopHelper}
            </span>
          </button>
        );
      })}
    </div>
  </div>
  <label className="block">
    <span className="text-xs font-medium text-muted">知识检索词</span>
    <input
      aria-label="知识检索词"
      className={`${formControlClass} h-10`}
      data-testid="content-knowledge-query"
      onChange={onKnowledgeQueryChange}
      value={knowledgeQuery}
    />
  </label>
  <label className="block">
    <span className="text-xs font-medium text-muted">目标人群</span>
    <input
      aria-label="目标人群"
      className={`${formControlClass} h-10`}
      data-testid="content-target-audience"
      onChange={onTargetAudienceChange}
      value={targetAudience}
    />
  </label>
  <div
    className="md:col-span-2 rounded-md border border-moss/25 bg-moss/10 px-3 py-2.5"
    data-testid="content-cover-direction-preview"
  >
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-muted">封面方向</span>
      <span
        className="shrink-0 rounded-full bg-paper/70 px-2 py-0.5 text-[10px] font-semibold text-moss"
        data-testid="content-cover-direction-type"
      >
        {coverDirectionPreviewLabel}
      </span>
    </div>
    <p className="mt-1 text-xs leading-5 text-ink">{coverDirectionPreview}</p>
  </div>
  <div className="md:col-span-2">
    <span className="text-xs font-medium text-muted">撰稿风格</span>
    <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
      {writingStylePresets.map((preset) => {
        const selected = stylePreset === preset.id;
        return (
          <button
            aria-pressed={selected}
            className={`min-h-20 rounded-md border px-3 py-2 text-left transition ${
              selected
                ? "border-coral bg-coral/10 text-ink"
                : "glass-control text-ink hover:border-coral/50"
            }`}
            key={preset.id}
            onClick={() => onApplyStylePreset(preset.id)}
            type="button"
          >
            <span className="block text-sm font-semibold">{preset.label}</span>
            <span className="mt-1 block text-xs leading-5 text-muted">
              {preset.helper}
            </span>
          </button>
        );
      })}
    </div>
  </div>
  <div className="md:col-span-2">
    <span className="text-xs font-medium text-muted">表达增强</span>
    <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-5">
      {expressionOptions.map((option) => {
        const enabled = styleOptions[option.key];
        return (
          <button
            aria-checked={enabled}
            className={`flex min-h-10 items-center justify-between gap-2 rounded-md border px-3 text-left text-xs font-medium transition ${
              enabled
                ? "border-moss bg-moss/10 text-ink"
                : "glass-control text-muted"
            }`}
            key={option.key}
            onClick={() => onToggleStyleOption(option.key)}
            role="switch"
            type="button"
          >
            <span>{option.label}</span>
            <span>{enabled ? "开" : "关"}</span>
          </button>
        );
      })}
    </div>
  </div>
  <label className="block md:col-span-2">
    <span className="flex items-center justify-between gap-3 text-xs font-medium text-muted">
      <span>风格要求</span>
      <span>{tone.length}/420</span>
    </span>
    <textarea
      aria-label="风格要求"
      className={`${formControlClass} min-h-24 resize-y py-2 leading-6`}
      data-testid="content-style-notes"
      maxLength={420}
      onChange={onToneChange}
      value={tone}
    />
  </label>
  <label className="block md:col-span-2">
    <span className="text-xs font-medium text-muted">标签</span>
    <input
      aria-label="标签"
      className={`${formControlClass} h-10`}
      data-testid="content-tags"
      onChange={onTagsTextChange}
      value={tagsText}
    />
  </label>
</div>
  );
});

interface PreviewPlaceholderProps {
  topic: string;
  coverDirectionPreview: string;
  previewTags: string[];
}

export const PreviewPlaceholder = memo(function PreviewPlaceholder({
  topic,
  coverDirectionPreview,
  previewTags
}: PreviewPlaceholderProps) {
  return (
<div className={`${subtleCardClass} p-4`}>
  <div className="flex items-center justify-between gap-3">
    <div className="text-sm font-semibold text-ink">小红书内容预览</div>
    <Pill tone="neutral">待生成</Pill>
  </div>
  <div className="mt-4 overflow-hidden rounded-md border border-line bg-paper/70">
    <div className="relative aspect-[3/4] bg-[linear-gradient(145deg,rgb(var(--moss)/0.18),rgb(var(--paper))_45%,rgb(var(--amber)/0.16))] p-4">
      <div className="absolute bottom-4 left-4 right-4">
        <div className="mb-3 h-1.5 w-12 rounded-full bg-moss" />
        <div className="line-clamp-4 text-2xl font-black leading-tight text-ink">
          {topic || "选择主题后一键生成"}
        </div>
      </div>
    </div>
    <div className="p-3">
      <div className="text-xs font-semibold text-muted">封面方向</div>
      <p className="mt-1 line-clamp-3 text-xs leading-5 text-ink">
        {coverDirectionPreview}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-steel">
        {previewTags.map((tag, index) => (
          <span key={`preview-tag-${index}-${tag}`}>#{tag.replace(/^#/, "")}</span>
        ))}
      </div>
    </div>
  </div>
</div>
  );
});
