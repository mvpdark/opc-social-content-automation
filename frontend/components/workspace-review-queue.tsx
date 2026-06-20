"use client";

import { type GeneratedContent } from "@/lib/generated-assets";
import { generatedContentStatusLabel } from "@/lib/status-labels";
import {
  formatDraftTime,
  secondaryButtonClass,
  subtleCardClass
} from "./workspace-utils";
import { Panel, Pill } from "./workspace-ui";

export function PcReviewQueuePanel({
  contents,
  error,
  loading,
  onRetry,
  onSelectContent
}: {
  contents: GeneratedContent[];
  error: string | null;
  loading: boolean;
  onRetry: () => void;
  onSelectContent: (content: GeneratedContent) => void;
}) {
  const visibleContents = contents.slice(0, 4);

  return (
    <Panel helper="只读查看待人工确认草稿；这里不会提交审核、发布或外发内容。" title="待人工确认">
      <div className="space-y-3" data-testid="pc-review-queue">
        <div className={`${subtleCardClass} flex items-center justify-between gap-3 px-4 py-3`}>
          <div>
            <div className="text-sm font-semibold">PC 待核对队列</div>
            <p className="mt-1 text-xs leading-5 text-muted">
              草稿、已润色和待确认内容需要人工读完后再进入发布准备。
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold" data-testid="pc-review-queue-count">
              {contents.length}
            </div>
            <div className="text-xs text-muted">待处理</div>
          </div>
        </div>
        {loading ? (
          <div
            className="rounded-md border border-dashed border-line px-3 py-4 text-sm font-medium leading-6 text-muted"
            data-testid="pc-review-queue-loading"
          >
            正在读取待人工确认队列...
          </div>
        ) : error ? (
          <div
            className="rounded-md border border-coral/30 bg-coral/10 px-3 py-4 text-sm leading-6 text-ink"
            data-testid="pc-review-queue-error"
          >
            <div className="font-semibold text-coral">待人工确认队列读取失败</div>
            <p className="mt-1 text-muted">{error}</p>
            <p className="mt-2 text-xs font-medium text-muted">
              请稍后刷新，或先检查服务连接；OPC 不会在队列不可读时自动发布。
            </p>
            <button
              className={`${secondaryButtonClass} mt-3 h-9 px-3 text-xs`}
              data-testid="pc-review-queue-retry"
              onClick={onRetry}
              type="button"
            >
              重新读取队列
            </button>
          </div>
        ) : visibleContents.length ? (
          <div className="space-y-2" data-testid="pc-review-queue-list">
            {visibleContents.map((content) => (
              <button
                className="w-full rounded-md border border-line bg-paper/70 px-3 py-3 text-left transition hover:border-moss/50 hover:bg-white/70"
                data-testid={`pc-review-queue-card-${content.id}`}
                key={`pc-review-queue-${content.id}`}
                onClick={() => onSelectContent(content)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-ink">{content.title}</span>
                  <Pill tone="amber">{generatedContentStatusLabel(content.status)}</Pill>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                  {content.body.replace(/\s+/g, " ").trim()}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-medium text-muted">
                  <span>{formatDraftTime(content.created_at)}</span>
                  <span>只读预览，不会自动发布</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div
            className="rounded-md border border-dashed border-line px-3 py-4 text-sm font-medium leading-6 text-muted"
            data-testid="pc-review-queue-empty"
          >
            当前没有待人工确认草稿。生成新内容后，会先出现在这里和草稿历史里。
          </div>
        )}
      </div>
    </Panel>
  );
}
