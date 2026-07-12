"use client";

import { memo } from "react";
import { ExternalLink, Loader2, Play } from "lucide-react";

import {
  primaryButtonClass,
  secondaryButtonClass
} from "@/components/trend-collector-helpers";

type BusyAction = "target" | "job" | "restart" | "digest" | "link" | null;

interface TrendCollectorResultsProps {
  maxItems: number;
  sourcesReviewed: boolean;
  canOpenSearch: boolean;
  canCreateJob: boolean;
  busyAction: BusyAction;
  isPollingJob: boolean;
  onOpenSearchPage: () => void;
  onCreateCollectionJob: () => void;
}

export const TrendCollectorResults = memo(function TrendCollectorResults({
  maxItems,
  sourcesReviewed,
  canOpenSearch,
  canCreateJob,
  busyAction,
  isPollingJob,
  onOpenSearchPage,
  onCreateCollectionJob
}: TrendCollectorResultsProps) {
  return (
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
            onClick={onOpenSearchPage}
            type="button"
          >
            <ExternalLink className="h-4 w-4" />
            打开来源页
          </button>
          <button
            className={primaryButtonClass}
            disabled={!canCreateJob}
            onClick={onCreateCollectionJob}
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
  );
});
