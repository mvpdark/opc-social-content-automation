import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import {
  collectionJobDiagnosticItems,
  formatCollectionJobStatus,
  isActiveCollectionJob,
  type CollectionJobDiagnosticItem
} from "@/lib/collection-job-status";
import type { MobileCollectionJob } from "@/components/mobile-collect-utils";

interface CollectionJobPollingParams {
  lastJobId: number | null;
  activeCollectionJobId: number | null;
  workspaceToken: string;
  onAction: (message: string) => void;
  fetchLatestCollectionJobRef: { current: (signal?: AbortSignal) => Promise<MobileCollectionJob | null> };
  fetchCollectionJobStatusRef: { current: (jobId: number, signal?: AbortSignal) => Promise<MobileCollectionJob> };
  loadTrendItemsRef: { current: (announce?: boolean) => Promise<void> };
  setLastJobId: Dispatch<SetStateAction<number | null>>;
  setLastRunAt: Dispatch<SetStateAction<string | null>>;
  setScheduleMessage: Dispatch<SetStateAction<string>>;
  setDiagnosticItems: Dispatch<SetStateAction<CollectionJobDiagnosticItem[]>>;
  setActiveCollectionJobId: Dispatch<SetStateAction<number | null>>;
}

/**
 * Encapsulates the three collection-job polling effects that were previously
 * inlined in CollectScreen:
 * 1. Restore the latest collection job on mount (when no job is tracked yet).
 * 2. Refresh the status of the last known job (when no active job is running).
 * 3. Poll the active collection job until it completes or fails.
 */
export function useCollectionJobPolling({
  lastJobId,
  activeCollectionJobId,
  workspaceToken,
  onAction,
  fetchLatestCollectionJobRef,
  fetchCollectionJobStatusRef,
  loadTrendItemsRef,
  setLastJobId,
  setLastRunAt,
  setScheduleMessage,
  setDiagnosticItems,
  setActiveCollectionJobId
}: CollectionJobPollingParams) {
  const onActionRef = useRef(onAction);
  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    if (lastJobId || activeCollectionJobId !== null || !workspaceToken.trim()) {
      return undefined;
    }

    let cancelled = false;
    const abortController = new AbortController();

    async function restoreLatestJob() {
      try {
        const job = await fetchLatestCollectionJobRef.current(abortController.signal);
        if (cancelled || !job) {
          return;
        }
        setLastJobId(job.id);
        setLastRunAt(job.updated_at ?? job.created_at ?? null);
        setScheduleMessage(formatCollectionJobStatus(job, "mobile"));
        setDiagnosticItems(collectionJobDiagnosticItems(job));
        if (isActiveCollectionJob(job)) {
          setActiveCollectionJobId(job.id);
        }
      } catch {
        // No saved mobile job yet, or the current account cannot read collection history.
      }
    }

    void restoreLatestJob();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [activeCollectionJobId, workspaceToken, lastJobId]);

  useEffect(() => {
    if (!lastJobId || activeCollectionJobId !== null) {
      return undefined;
    }

    let cancelled = false;
    const abortController = new AbortController();

    async function refreshLastJob() {
      try {
        const job = await fetchCollectionJobStatusRef.current(lastJobId as number, abortController.signal);
        if (cancelled) {
          return;
        }
        setScheduleMessage(formatCollectionJobStatus(job, "mobile"));
        setDiagnosticItems(collectionJobDiagnosticItems(job));
        if (isActiveCollectionJob(job)) {
          setActiveCollectionJobId(job.id);
        }
      } catch {
        // The user can still create a fresh collection task if the old job no longer exists.
      }
    }

    void refreshLastJob();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [activeCollectionJobId, lastJobId]);

  useEffect(() => {
    if (activeCollectionJobId === null) {
      return undefined;
    }

    let cancelled = false;
    let timer: number | undefined;
    const abortController = new AbortController();

    async function pollCollectionJob() {
      try {
        const job = await fetchCollectionJobStatusRef.current(activeCollectionJobId as number, abortController.signal);
        if (cancelled) {
          return;
        }
        const message = formatCollectionJobStatus(job, "mobile");
        setScheduleMessage(message);
        setDiagnosticItems(collectionJobDiagnosticItems(job));
        if (!isActiveCollectionJob(job)) {
          setActiveCollectionJobId(null);
          onActionRef.current(message);
          if (job.status === "completed") {
            void loadTrendItemsRef.current(true);
          }
          return;
        }
        timer = window.setTimeout(pollCollectionJob, 3000);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setScheduleMessage(error instanceof Error ? error.message : "采集状态刷新失败。");
        setDiagnosticItems([]);
        timer = window.setTimeout(pollCollectionJob, 5000);
      }
    }

    timer = window.setTimeout(pollCollectionJob, 800);

    return () => {
      cancelled = true;
      abortController.abort();
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [activeCollectionJobId]);
}
