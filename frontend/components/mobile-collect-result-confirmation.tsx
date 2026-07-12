"use client";

import { memo } from "react";
import { Inbox, Loader2, RefreshCw, Save, ShieldCheck, Zap } from "lucide-react";

import {
  MemoizedTrendSourceCard,
  type MobileTrendContent
} from "@/components/mobile-trend-source-review";

type BusyAction = "digest" | "job" | "link" | "search" | null;

interface CollectResultConfirmationProps {
  activeCollectionJobId: number | null;
  allPendingSelected: boolean;
  busyAction: BusyAction;
  collectionBusy: boolean;
  deletingTrendIdSet: Set<number>;
  onClearSelection: () => void;
  onConfirmSelected: () => void;
  onConfirmSingle: (item: MobileTrendContent) => void;
  onDelete: (item: MobileTrendContent) => void;
  onOpen: (item: MobileTrendContent) => void;
  onOpenUrl: (item: MobileTrendContent) => void;
  onRefresh: () => void;
  onRunManualCollection: () => void;
  onSaveDigest: () => void;
  onSelectAll: () => void;
  onToggle: (itemId: number) => void;
  pendingTrendItems: MobileTrendContent[];
  reviewedTrendIdSet: Set<number>;
  reviewedTrendIds: number[];
  selectedPendingCount: number;
  selectedTrendIdSet: Set<number>;
  selectedTrendIds: number[];
  sourceReviewed: boolean;
  trendListLoading: boolean;
  trendListStatus: string;
}

export const CollectResultConfirmation = memo(function CollectResultConfirmation({
  activeCollectionJobId,
  allPendingSelected,
  busyAction,
  collectionBusy,
  deletingTrendIdSet,
  onClearSelection,
  onConfirmSelected,
  onConfirmSingle,
  onDelete,
  onOpen,
  onOpenUrl,
  onRefresh,
  onRunManualCollection,
  onSaveDigest,
  onSelectAll,
  onToggle,
  pendingTrendItems,
  reviewedTrendIdSet,
  reviewedTrendIds,
  selectedPendingCount,
  selectedTrendIdSet,
  selectedTrendIds,
  sourceReviewed,
  trendListLoading,
  trendListStatus
}: CollectResultConfirmationProps) {
  return (
    <section aria-label="采集结果确认" className="relative overflow-hidden rounded-[30px] border border-white/[0.92] bg-[rgba(255,253,247,0.88)] p-3 shadow-[0_18px_40px_rgba(31,58,49,0.09),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <h2 className="text-[22px] font-black leading-7">采集结果确认</h2>
        <div className="flex items-center gap-3 text-sm font-black">
          <span>
            待确认 {pendingTrendItems.length}
            {reviewedTrendIds.length ? ` · 待保存 ${reviewedTrendIds.length}` : ""}
          </span>
          <button
            aria-busy={trendListLoading}
            aria-label="刷新采集素材列表"
            className="flex touch-manipulation items-center gap-1 rounded-full px-2 py-1 text-moss active:bg-sage"
            disabled={trendListLoading}
            onClick={onRefresh}
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

      <div className="max-h-[310px] space-y-2 overflow-y-auto pr-0.5" data-testid="mobile-trend-source-list" role="region" aria-label="采集素材列表">
        {pendingTrendItems.length ? (
          pendingTrendItems.map((item) => (
            <MemoizedTrendSourceCard
              deleting={deletingTrendIdSet.has(item.id)}
              item={item}
              key={`mobile-trend-source-${item.id}`}
              onConfirmSwipe={onConfirmSingle}
              onDeleteSwipe={onDelete}
              onOpen={onOpen}
              onOpenUrl={onOpenUrl}
              onToggle={onToggle}
              reviewed={reviewedTrendIdSet.has(item.id)}
              selected={selectedTrendIdSet.has(item.id)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-[24px] border border-dashed border-sage bg-white/[0.54] px-4 py-6 text-center text-xs font-semibold leading-5 text-muted" role="status">
            <Inbox className="h-7 w-7 text-sage/70" strokeWidth={2} />
            <span>{trendListLoading
              ? "正在读取采集素材..."
              : reviewedTrendIds.length
                ? "本批来源已确认，可先保存摘要；继续运行采集会显示新素材。"
                : "暂无可确认素材，点击立即运行或刷新素材。"}</span>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full border border-sage bg-white/[0.76] text-sm font-black text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99] disabled:opacity-60"
          disabled={!selectedTrendIds.length}
          onClick={onConfirmSelected}
          type="button"
        >
          <ShieldCheck className="h-4 w-4" />
          确认所选
        </button>
        <button
          aria-busy={busyAction === "digest"}
          className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full bg-moss text-sm font-black text-white shadow-moss-sm active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-save-digest"
          disabled={busyAction === "digest" || !sourceReviewed}
          onClick={onSaveDigest}
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
        <div className="mt-2 rounded-[22px] border border-sage bg-sage px-3 py-2">
          <p className="text-[11px] font-semibold leading-5 text-moss">
            已确认 {reviewedTrendIds.length} 条素材，仍会保留在待保存摘要里；需要补充素材时可直接采下一批。
          </p>
          <button
            aria-busy={busyAction === "job" || activeCollectionJobId !== null}
            className="mt-2 flex h-10 w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-white text-xs font-black text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99] disabled:opacity-60"
            data-testid="mobile-collect-next-batch"
            disabled={collectionBusy}
            onClick={onRunManualCollection}
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
              ? onClearSelection
              : onSelectAll
            : onRunManualCollection
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
  );
});
