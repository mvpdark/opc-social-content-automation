export function collectionJobStatusLabel(status: string) {
  switch (status) {
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    case "needs_operator_review":
      return "需要人工处理";
    case "queued":
      return "排队中";
    case "running":
      return "采集中";
    default:
      return "待确认";
  }
}

export function generatedContentStatusLabel(status: string) {
  switch (status) {
    case "approved":
      return "已确认";
    case "draft":
      return "草稿";
    case "generated":
      return "已生成";
    case "needs_review":
    case "review_pending":
      return "待确认";
    case "published":
      return "已发布";
    case "rewritten":
      return "已润色";
    default:
      return "待确认";
  }
}

const unsafeGeneratedContentStatuses = new Set(["published", "submitted"]);

export function isUnsafeGeneratedContentStatus(status: string) {
  return unsafeGeneratedContentStatuses.has(status);
}

export function generatedContentLifecycleWarning(status: string) {
  if (!isUnsafeGeneratedContentStatus(status)) {
    return null;
  }
  const statusLabel = status === "published" ? generatedContentStatusLabel(status) : status;
  return `后端返回状态为「${statusLabel}」，发布前请先核对人工确认记录；OPC 不会自动发布。`;
}

export function generatedImageStatusLabel(status: string) {
  switch (status) {
    case "approved":
      return "已确认";
    case "failed":
      return "生成失败";
    case "generated":
      return "已生成";
    case "needs_review":
    case "review_pending":
      return "待确认";
    default:
      return "待确认";
  }
}
