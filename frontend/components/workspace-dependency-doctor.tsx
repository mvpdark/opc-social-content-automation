"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Terminal
} from "lucide-react";
import {
  API_BASE,
  dependencyStatusLabel,
  dependencyTone,
  readApiError,
  secondaryButtonClass,
  subtleCardClass,
  isDependencyReport,
  type DependencyReport
} from "./workspace-utils";
import { Panel, Pill } from "./workspace-ui";

export const DependencyDoctorPanel = memo(function DependencyDoctorPanel({
  workspaceToken
}: {
  workspaceToken: string;
}) {
  const [dependencyReport, setDependencyReport] = useState<DependencyReport | null>(null);
  const [dependencyBusy, setDependencyBusy] = useState(false);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [showRepairPlan, setShowRepairPlan] = useState(false);
  const activeRef = useRef(true);
  const requestIdRef = useRef(0);
  const manualAbortRef = useRef<AbortController | null>(null);

  const loadDependencyReport = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestIdRef.current;
    setDependencyBusy(true);
    setDependencyError(null);
    try {
      const headers = workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : undefined;
      const response = await fetch(`${API_BASE}/workspace/dependencies`, {
        headers,
        signal
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "依赖检测失败。"));
      }
      const raw = await response.json();
      if (!isDependencyReport(raw)) throw new Error("依赖检测数据格式异常。");
      if (!activeRef.current || requestIdRef.current !== requestId) return;
      setDependencyReport(raw);
    } catch (error) {
      if (!activeRef.current || requestIdRef.current !== requestId) return;
      if (signal?.aborted) return;
      setDependencyError(error instanceof Error ? error.message : "依赖检测失败。");
    } finally {
      if (activeRef.current && requestIdRef.current === requestId && !signal?.aborted) setDependencyBusy(false);
    }
  }, [workspaceToken]);

  useEffect(() => {
    activeRef.current = true;
    const abortController = new AbortController();
    void loadDependencyReport(abortController.signal);
    return () => {
      activeRef.current = false;
      abortController.abort();
      manualAbortRef.current?.abort();
    };
  }, [loadDependencyReport]);

  const blockedCount = dependencyReport?.summary.blocking ?? 0;
  const warningCount = dependencyReport?.summary.warning ?? 0;
  const totalCount = dependencyReport?.summary.total ?? 0;
  const reportTone =
    dependencyReport?.status === "blocked"
      ? "red"
      : dependencyReport?.status === "attention"
        ? "amber"
        : "green";
  const reportLabel =
    dependencyReport?.status === "blocked"
      ? "需处理"
      : dependencyReport?.status === "attention"
        ? "有提醒"
        : "正常";
  const attentionItems = useMemo(
    () => dependencyReport?.items.filter((item) => item.status !== "ok").slice(0, 8) ?? [],
    [dependencyReport]
  );
  const hasDependencyIssues = useMemo(
    () =>
      Boolean(
        dependencyReport && (dependencyReport.status !== "ok" || attentionItems.length > 0)
      ),
    [dependencyReport, attentionItems]
  );
  const primaryRepairStep = dependencyReport?.repair_steps[0] ?? "python scripts/setup_local.py";
  const handleManualRefresh = useCallback(() => {
    manualAbortRef.current?.abort();
    const controller = new AbortController();
    manualAbortRef.current = controller;
    void loadDependencyReport(controller.signal);
  }, [loadDependencyReport]);

  const refreshAction = useMemo(
    () => (
      <button
        aria-label="检测依赖"
        className={`${secondaryButtonClass} h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60`}
        disabled={dependencyBusy}
        onClick={handleManualRefresh}
        type="button"
      >
        {dependencyBusy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RotateCcw className="h-3.5 w-3.5" />
        )}
        检测依赖
      </button>
    ),
    [dependencyBusy, handleManualRefresh]
  );

  return (
    <Panel
      action={refreshAction}
      helper="换设备或首次安装时先看这里；Windows 安装包会检查运行环境和项目依赖。"
      title="环境检测与一键修复"
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
        <div className={`${subtleCardClass} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">依赖状态</div>
              <p className="mt-1 text-xs leading-5 text-muted">
                {dependencyReport
                  ? `已检测 ${totalCount} 项`
                  : dependencyBusy
                    ? "正在检测当前设备"
                    : "尚未完成检测"}
              </p>
            </div>
            <Pill tone={dependencyReport ? reportTone : "neutral"}>{dependencyReport ? reportLabel : "待检测"}</Pill>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-line bg-mist px-2 py-2">
              <div className="text-lg font-semibold">{blockedCount}</div>
              <div className="text-[11px] text-muted">阻塞</div>
            </div>
            <div className="rounded-md border border-line bg-mist px-2 py-2">
              <div className="text-lg font-semibold">{warningCount}</div>
              <div className="text-[11px] text-muted">提醒</div>
            </div>
            <div className="rounded-md border border-line bg-mist px-2 py-2">
              <div className="text-lg font-semibold">{totalCount}</div>
              <div className="text-[11px] text-muted">总项</div>
            </div>
          </div>
          <button
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ink text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!dependencyReport || !hasDependencyIssues}
            onClick={() => {
              if (hasDependencyIssues) {
                setShowRepairPlan((current) => !current);
              }
            }}
            type="button"
          >
            {dependencyReport && !hasDependencyIssues ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Terminal className="h-4 w-4" />
            )}
            {dependencyReport && !hasDependencyIssues ? "无需修复" : "查看修复方案"}
          </button>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            {hasDependencyIssues ? (
              <>
                推荐处理：<span className="font-mono text-ink">{primaryRepairStep}</span>
              </>
            ) : dependencyReport ? (
              "当前环境满足运行要求。"
            ) : (
              "检测后会显示需要处理的修复建议。"
            )}
          </p>
        </div>

        <div className="space-y-3">
          {dependencyError ? (
            <div className={`${subtleCardClass} border-coral/40 p-4 text-sm text-coral`}>
              {dependencyError}
            </div>
          ) : null}
          {attentionItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              {attentionItems.map((item, index) => (
                <div className={`${subtleCardClass} p-3`} key={`attention-${index}-${item.category}-${item.name}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {item.status === "missing" || item.status === "outdated" ? (
                          <AlertTriangle className="h-4 w-4 text-coral" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-amber" />
                        )}
                        <span className="text-sm font-semibold">{item.name}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted">{item.message}</p>
                      <p className="mt-1 text-[11px] leading-5 text-muted">
                        当前：{item.detected || "未检测到"}
                        {item.minimum ? ` · 要求：${item.minimum}+` : ""}
                      </p>
                    </div>
                    <Pill tone={dependencyTone[item.status]}>
                      {dependencyStatusLabel[item.status]}
                    </Pill>
                  </div>
                </div>
              ))}
            </div>
          ) : dependencyReport ? (
            <div className={`${subtleCardClass} p-4`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-moss" />
                核心依赖满足当前项目要求
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                普通安装包模式无需额外安装系统组件；后续切换电脑时重新检测即可。
              </p>
            </div>
          ) : (
            <div className={`${subtleCardClass} p-4 text-sm text-muted`}>
              点击“检测依赖”查看当前设备状态。
            </div>
          )}

          {showRepairPlan && dependencyReport && hasDependencyIssues ? (
            <div className={`${subtleCardClass} p-4`}>
              <div className="text-sm font-semibold">修复方案</div>
              <div className="mt-3 space-y-2">
                {dependencyReport.repair_steps.map((step, index) => (
                  <div
                    className="rounded-md border border-line bg-ink px-3 py-2 font-mono text-xs leading-5 text-paper"
                    key={`${step}-${index}`}
                  >
                    {step}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">
                当前只生成修复建议，不会直接安装系统组件；Windows 安装包模式不需要 Docker，自部署模式才会提示 Docker。
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
});
