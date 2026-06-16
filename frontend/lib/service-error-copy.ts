export const SERVICE_CONFIG_READ_ERROR = "服务配置读取失败。";
const GENERIC_STRUCTURED_SERVICE_ERROR =
  "服务返回了需要人工处理的错误，请刷新当前数据后重试。";

function normalizeServiceErrorMessage(message: unknown): string {
  if (typeof message === "string") {
    return message;
  }
  if (message instanceof Error) {
    return message.message;
  }
  if (message === null || message === undefined) {
    return "";
  }
  if (typeof message === "object") {
    const errorObject = message as { detail?: unknown; error?: unknown; message?: unknown };
    const nestedMessage = errorObject.message ?? errorObject.detail ?? errorObject.error;
    if (typeof nestedMessage === "string") {
      return nestedMessage;
    }
    return GENERIC_STRUCTURED_SERVICE_ERROR;
  }
  return String(message);
}

export function sanitizeServiceErrorMessage(message: unknown) {
  return normalizeServiceErrorMessage(message)
    .replace(/Failed to fetch/gi, "服务暂时连接不上，请确认应用服务已启动。")
    .replace(/NetworkError/gi, "网络连接异常，请稍后重试。")
    .replace(/Load failed/gi, "服务加载失败，请稍后重试。")
    .replace(
      /Visible browser collection failed\.?\s*Check local browser setup and session state\.?/gi,
      "采集浏览器运行失败，请确认本机浏览器会话可用后重试。"
    )
    .replace(/API\s*Key/gi, "服务授权")
    .replace(/Bearer\s*token/gi, "访问凭证")
    .replace(/provider/gi, "服务")
    .replace(/endpoint/gi, "服务地址")
    .replace(/payload/gi, "请求内容");
}

const DRAFT_GENERATION_RECOVERY_MARKERS = [
  "草稿生成结果为空",
  "草稿正文过短",
  "元数据段落",
  "独立话题标签行",
  "撰稿结果偏离选题"
] as const;

const DRAFT_MISSING_REQUIRED_WEB_SOURCE_MARKERS = [
  "缺少可见 Tavily 来源",
  "缺少可见 Tavily 结果",
  "不要让模型猜测学校、价格、logo 或排名结论"
] as const;

export function formatDraftGenerationErrorMessage(message: string) {
  const normalizedMessage = sanitizeServiceErrorMessage(message).trim() || "图文草稿生成失败。";
  const missingRequiredWebSourceIssue = DRAFT_MISSING_REQUIRED_WEB_SOURCE_MARKERS.some((marker) =>
    normalizedMessage.includes(marker)
  );
  const needsRecoveryCopy = DRAFT_GENERATION_RECOVERY_MARKERS.some((marker) =>
    normalizedMessage.includes(marker)
  );

  if (missingRequiredWebSourceIssue && !normalizedMessage.includes("生成已停止")) {
    return `生成已停止：这个选题缺少可见 Tavily 来源，先补来源或改成核验框架；系统不会保存模型猜测的学校、价格、logo 或排名结论。${normalizedMessage}`;
  }

  if (!needsRecoveryCopy || normalizedMessage.includes("生成结果需要补救")) {
    return normalizedMessage;
  }

  return `生成结果需要补救：请补充业务素材、核对选题/标签/检索依据后重新生成；系统不会保存这次不合格草稿。${normalizedMessage}`;
}

export function isServiceCredentialError(message: string) {
  return /API\s*Key/i.test(message) || /Bearer\s*token/i.test(message);
}
