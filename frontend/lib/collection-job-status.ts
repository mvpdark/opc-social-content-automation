import { collectionJobStatusLabel } from "@/lib/status-labels";

export const COLLECTION_JOB_TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
  "needs_operator_review"
]);

export type CollectionJobStatusSnapshot = {
  id: number;
  status: string;
  created_at?: string;
  updated_at?: string;
  result_summary: {
    auto_start?: boolean;
    blocked_candidates?: number;
    collected_items?: number;
    final_url?: string | null;
    message?: string;
    operator_wait_seconds?: number;
    page_title?: string | null;
    raw_candidates?: number;
    trend_ids?: number[];
  } | null;
  error: string | null;
};

export type CollectionJobDiagnosticItem = {
  label: string;
  value: string;
  tone: "neutral" | "good" | "warning" | "danger";
};

const AUTO_STARTED_QUEUE_STALE_MS = 2 * 60 * 1000;
const COLLECTION_RETRY_HINT = "也可以换一个更具体的关键词，或粘贴小红书链接导入。";

function pushDiagnosticItem(
  items: CollectionJobDiagnosticItem[],
  label: string,
  value: string | number | null | undefined,
  tone: CollectionJobDiagnosticItem["tone"] = "neutral"
) {
  if (value === null || value === undefined || value === "") {
    return;
  }
  items.push({ label, value: String(value), tone });
}

function collectionJobStatusParts(job: CollectionJobStatusSnapshot) {
  const summary = job.result_summary;
  const collected =
    typeof summary?.collected_items === "number" ? `，已采集 ${summary.collected_items} 条` : "";
  const diagnostics = [
    typeof summary?.raw_candidates === "number" ? `找到候选 ${summary.raw_candidates} 条` : "",
    typeof summary?.blocked_candidates === "number" ? `已过滤 ${summary.blocked_candidates} 条` : "",
    summary?.page_title ? `页面：${summary.page_title}` : ""
  ].filter(Boolean);
  const diagnosticText = diagnostics.length ? `（${diagnostics.join("，")}）` : "";
  const waitText =
    typeof summary?.operator_wait_seconds === "number"
      ? `，浏览器等待 ${summary.operator_wait_seconds} 秒`
      : "";
  const errorText = job.error ? `；${job.error}` : "";

  return {
    collected,
    diagnosticText,
    errorText,
    waitText
  };
}

export function isStaleAutoStartedQueuedJob(job: CollectionJobStatusSnapshot) {
  if (job.status !== "queued" || !job.result_summary?.auto_start) {
    return false;
  }

  const updatedAt = job.updated_at ?? job.created_at;
  if (!updatedAt) {
    return false;
  }

  const updatedAtTime = new Date(updatedAt).getTime();
  return Number.isFinite(updatedAtTime) && Date.now() - updatedAtTime > AUTO_STARTED_QUEUE_STALE_MS;
}

export function isActiveCollectionJob(job: CollectionJobStatusSnapshot) {
  if (COLLECTION_JOB_TERMINAL_STATUSES.has(job.status) || isStaleAutoStartedQueuedJob(job)) {
    return false;
  }
  if (job.status === "queued") {
    return Boolean(job.result_summary?.auto_start);
  }
  return true;
}

export function isRestartableCollectionJob(job: CollectionJobStatusSnapshot) {
  return (
    (job.status === "queued" && !job.result_summary?.auto_start) ||
    isStaleAutoStartedQueuedJob(job) ||
    job.status === "needs_operator_review" ||
    job.status === "failed"
  );
}

export function collectionJobDiagnosticItems(
  job: CollectionJobStatusSnapshot
): CollectionJobDiagnosticItem[] {
  const summary = job.result_summary;
  const items: CollectionJobDiagnosticItem[] = [];
  const statusTone: CollectionJobDiagnosticItem["tone"] =
    job.status === "completed"
      ? "good"
      : job.status === "failed"
        ? "danger"
        : job.status === "needs_operator_review"
          ? "warning"
          : isStaleAutoStartedQueuedJob(job)
            ? "warning"
          : "neutral";

  pushDiagnosticItem(items, "当前状态", collectionJobStatusLabel(job.status), statusTone);
  pushDiagnosticItem(items, "已采集", summary?.collected_items, "good");
  pushDiagnosticItem(items, "候选", summary?.raw_candidates);
  pushDiagnosticItem(items, "已过滤", summary?.blocked_candidates, "warning");
  pushDiagnosticItem(items, "等待", summary?.operator_wait_seconds ? `${summary.operator_wait_seconds} 秒` : null);
  pushDiagnosticItem(items, "页面", summary?.page_title);

  if (isStaleAutoStartedQueuedJob(job)) {
    pushDiagnosticItem(items, "下一步", "后台启动可能中断，点击继续上次采集", "warning");
  } else if (job.status === "queued" && !summary?.auto_start) {
    pushDiagnosticItem(items, "下一步", "点击继续上次采集", "warning");
  } else if (job.status === "running") {
    pushDiagnosticItem(items, "下一步", "必要时打开登录浏览器", "neutral");
  } else if (job.status === "completed") {
    pushDiagnosticItem(items, "下一步", "人工确认来源后保存摘要", "good");
  } else if (job.status === "needs_operator_review") {
    pushDiagnosticItem(items, "下一步", "处理登录/验证码后重试", "warning");
  } else if (job.status === "failed") {
    pushDiagnosticItem(items, "下一步", "重试、换关键词或链接导入", "danger");
  }

  return items;
}

export function formatCollectionJobStatus(
  job: CollectionJobStatusSnapshot,
  surface: "desktop" | "mobile" = "desktop"
) {
  const { collected, diagnosticText, errorText, waitText } = collectionJobStatusParts(job);

  if (surface === "mobile") {
    if (job.status === "queued") {
      if (isStaleAutoStartedQueuedJob(job)) {
        return `采集任务仍在排队${collected}，后台启动可能已经中断。请回到采集页手动继续，或重新开始一次。`;
      }
      if (!job.result_summary?.auto_start) {
        return `上次采集仍在排队${collected}，但不会自动启动。请重新开始一次采集。`;
      }
      return `正在排队${collected}，采集浏览器即将启动。`;
    }
    if (job.status === "running") {
      return `正在采集中${collected}${waitText}。遇到登录或验证码时，先打开登录浏览器人工处理。`;
    }
    if (job.status === "completed") {
      return `采集已完成${collected}${diagnosticText}。请人工确认来源后再保存知识摘要。`;
    }
    if (job.status === "needs_operator_review") {
      return `需要人工处理${collected}${diagnosticText}。可能是登录墙、验证码或空结果，处理后可重新运行；${COLLECTION_RETRY_HINT}${errorText}`;
    }
    if (job.status === "failed") {
      return `采集失败${collected}${diagnosticText}${errorText}。可以重新运行一次；${COLLECTION_RETRY_HINT}`;
    }
    return `采集进度：${collectionJobStatusLabel(job.status)}${collected}${diagnosticText}${errorText}。`;
  }

  if (job.status === "queued") {
    if (isStaleAutoStartedQueuedJob(job)) {
      return `上次采集仍在排队${collected}，但后台启动可能已经中断；请点击“继续上次采集”。`;
    }
    if (!job.result_summary?.auto_start) {
      return `上次采集仍在排队${collected}。它不会自动开始；请点击“继续上次采集”。`;
    }
    return `本次采集${collectionJobStatusLabel(job.status)}${collected}。采集浏览器正在启动。`;
  }
  if (job.status === "running") {
    return `本次采集${collectionJobStatusLabel(job.status)}${collected}${waitText}。采集浏览器会隐藏运行；如果遇到登录或验证码，请先打开登录浏览器人工处理。`;
  }
  if (job.status === "completed") {
    return `本次采集${collectionJobStatusLabel(job.status)}${collected}${diagnosticText}。请人工确认来源后再保存知识摘要。`;
  }
  if (job.status === "needs_operator_review") {
    return `本次采集需要人工处理${collected}${diagnosticText}。公开搜索可能被登录墙、验证码或空结果拦截；人工确认后可直接重试，也可以换关键词或粘贴小红书链接导入。${errorText}`;
  }
  if (job.status === "failed") {
    return `本次采集失败${collected}${diagnosticText}${errorText}。可以直接重新采集一次，也可以换关键词或粘贴小红书链接导入。`;
  }

  return `采集进度：${collectionJobStatusLabel(job.status)}${collected}${diagnosticText}${errorText}。`;
}
