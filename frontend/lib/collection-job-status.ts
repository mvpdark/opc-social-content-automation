import { collectionJobStatusLabel } from "@/lib/status-labels";

export const COLLECTION_JOB_TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
  "needs_operator_review"
]);

export type CollectionJobStatusSnapshot = {
  id: number;
  status: string;
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

const COLLECTION_RETRY_HINT = "也可以换一个更具体的关键词，或粘贴小红书链接导入。";

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

export function isRestartableCollectionJob(job: CollectionJobStatusSnapshot) {
  return (
    (job.status === "queued" && !job.result_summary?.auto_start) ||
    job.status === "needs_operator_review" ||
    job.status === "failed"
  );
}

export function formatCollectionJobStatus(
  job: CollectionJobStatusSnapshot,
  surface: "desktop" | "mobile" = "desktop"
) {
  const { collected, diagnosticText, errorText, waitText } = collectionJobStatusParts(job);

  if (surface === "mobile") {
    if (job.status === "queued") {
      return `正在排队${collected}，可见浏览器即将打开。`;
    }
    if (job.status === "running") {
      return `正在采集中${collected}${waitText}。遇到登录或验证码时，先在浏览器里人工处理。`;
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
    if (!job.result_summary?.auto_start) {
      return `上次采集仍在排队${collected}。它不会自动开始；请点击“继续上次采集”。`;
    }
    return `本次采集${collectionJobStatusLabel(job.status)}${collected}。采集器正在启动，可见浏览器会自动打开。`;
  }
  if (job.status === "running") {
    return `本次采集${collectionJobStatusLabel(job.status)}${collected}${waitText}。请留意自动打开的浏览器窗口；如果遇到登录或验证码，先人工处理。`;
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
