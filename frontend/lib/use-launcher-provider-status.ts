"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ProviderStatusItem } from "@/lib/provider-settings";
import {
  API_BASE,
  fetchProviderStatuses,
  hasLiveImageProvider,
  isProviderCheckResult,
  readApiError,
  type ProviderCheckResult
} from "@/components/workspace-utils";
import {
  sanitizeServiceErrorMessage,
  SERVICE_CONFIG_READ_ERROR
} from "@/lib/service-error-copy";

const PROVIDER_DISPLAY_BASE: ReadonlyArray<{ label: string; name: string }> = [
  { label: "撰稿", name: "Draft generation" },
  { label: "改写", name: "Humanization rewrite" },
  { label: "图片", name: "Image generation" }
];

export function buildAuthHeaders(workspaceToken: string) {
  return {
    "Content-Type": "application/json",
    ...(workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : {})
  };
}

export function useLauncherProviderStatus(
  workspaceToken: string,
  setStatusText: (text: string) => void
) {
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatusItem[]>([]);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);
  const [draftCheckStatus, setDraftCheckStatus] = useState<ProviderCheckResult | null>(null);
  const [draftCheckBusy, setDraftCheckBusy] = useState(false);
  const [needsProviderSettings, setNeedsProviderSettings] = useState(false);

  const activeRef = useRef(true);
  const providerStatusRequestIdRef = useRef(0);
  const draftCheckRequestIdRef = useRef(0);
  const providerStatusAbortRef = useRef<AbortController | null>(null);

  const refreshProviderStatuses = useCallback(async () => {
    providerStatusAbortRef.current?.abort();
    const controller = new AbortController();
    providerStatusAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const requestId = ++providerStatusRequestIdRef.current;
    try {
      const data = await fetchProviderStatuses(workspaceToken, controller.signal);
      if (!activeRef.current || providerStatusRequestIdRef.current !== requestId) return null;
      setProviderStatuses(data);
      setProviderStatusError(null);
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return null;
      if (!activeRef.current || providerStatusRequestIdRef.current !== requestId) return null;
      setProviderStatusError(
        sanitizeServiceErrorMessage(error instanceof Error ? error.message : SERVICE_CONFIG_READ_ERROR)
      );
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }, [workspaceToken]);

  useEffect(() => {
    let active = true;
    activeRef.current = true;
    const abortController = new AbortController();

    async function loadProviderStatuses() {
      const requestId = ++providerStatusRequestIdRef.current;
      try {
        const data = await fetchProviderStatuses(workspaceToken, abortController.signal);
        if (active && providerStatusRequestIdRef.current === requestId) {
          setProviderStatuses(data);
          setProviderStatusError(null);
        }
      } catch (error) {
        if (active && providerStatusRequestIdRef.current === requestId) {
          setProviderStatusError(
            sanitizeServiceErrorMessage(error instanceof Error ? error.message : SERVICE_CONFIG_READ_ERROR)
          );
        }
      }
    }

    void loadProviderStatuses();
    return () => {
      active = false;
      activeRef.current = false;
      abortController.abort();
      providerStatusAbortRef.current?.abort();
    };
  }, [workspaceToken]);

  const checkDraftProvider = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++draftCheckRequestIdRef.current;
    setDraftCheckBusy(true);
    setDraftCheckStatus(null);
    setStatusText("正在检测撰稿服务连接。");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const onAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    }
    try {
      const response = await fetch(`${API_BASE}/workspace/provider-check`, {
        method: "POST",
        headers: buildAuthHeaders(workspaceToken),
        signal: controller.signal,
        body: JSON.stringify({ target: "draft" })
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("服务检测暂时不可用，请重新打开应用后再试。");
        }
        throw new Error(await readApiError(response, "撰稿服务检测失败。"));
      }
      const raw: unknown = await response.json();
      if (!isProviderCheckResult(raw)) {
        throw new Error("撰稿服务检测返回数据格式异常。");
      }
      const data = raw;
      const displayData = { ...data, message: sanitizeServiceErrorMessage(data.message) };
      if (!activeRef.current || draftCheckRequestIdRef.current !== requestId) return;
      setDraftCheckStatus(displayData);
      setNeedsProviderSettings(displayData.status !== "ok");
      setStatusText(
        displayData.status === "ok"
          ? displayData.message
          : `检测未通过：${displayData.message}`
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const message = sanitizeServiceErrorMessage(
        error instanceof Error ? error.message : "撰稿服务检测失败。"
      );
      if (!activeRef.current || draftCheckRequestIdRef.current !== requestId) return;
      setDraftCheckStatus({
        configured: false,
        message,
        status: "failed",
        target: "draft"
      });
      setNeedsProviderSettings(true);
      setStatusText(message);
    } finally {
      clearTimeout(timeoutId);
      if (signal && !signal.aborted) {
        signal.removeEventListener("abort", onAbort);
      }
      if (activeRef.current && draftCheckRequestIdRef.current === requestId) setDraftCheckBusy(false);
    }
  }, [workspaceToken, setStatusText]);

  const { draftProviderMissing, draftProviderCheckFailed, draftProviderBlocked } = useMemo(() => {
    const draftProviderStatus = providerStatuses.find((item) => item.name === "Draft generation");
    const missing = Boolean(providerStatuses.length && !draftProviderStatus?.configured);
    const checkFailed = Boolean(draftCheckStatus && draftCheckStatus.status !== "ok");
    return { draftProviderMissing: missing, draftProviderCheckFailed: checkFailed, draftProviderBlocked: missing || checkFailed };
  }, [providerStatuses, draftCheckStatus]);

  const providerDisplayItems = useMemo(() => PROVIDER_DISPLAY_BASE.map((item) => ({
    ...item,
    status: providerStatuses.find((statusItem) => statusItem.name === item.name)
  })), [providerStatuses]);

  const { liveImageProviderReady, rewriteProviderReady } = useMemo(() => {
    const rewriteProviderStatus = providerStatuses.find(
      (item) => item.name === "Humanization rewrite"
    );
    return {
      liveImageProviderReady: hasLiveImageProvider(providerStatuses),
      rewriteProviderReady: Boolean(rewriteProviderStatus?.configured)
    };
  }, [providerStatuses]);

  return {
    providerStatuses,
    providerStatusError,
    draftCheckStatus,
    draftCheckBusy,
    needsProviderSettings,
    setNeedsProviderSettings,
    draftProviderMissing,
    draftProviderCheckFailed,
    draftProviderBlocked,
    providerDisplayItems,
    liveImageProviderReady,
    rewriteProviderReady,
    refreshProviderStatuses,
    checkDraftProvider
  };
}