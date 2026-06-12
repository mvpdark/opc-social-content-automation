export function sanitizeServiceErrorMessage(message: string) {
  return message
    .replace(/Failed to fetch/gi, "服务暂时连接不上，请确认应用服务已启动。")
    .replace(/NetworkError/gi, "网络连接异常，请稍后重试。")
    .replace(/Load failed/gi, "服务加载失败，请稍后重试。")
    .replace(/API\s*Key/gi, "服务密钥")
    .replace(/Bearer\s*token/gi, "访问凭证")
    .replace(/provider/gi, "服务")
    .replace(/endpoint/gi, "服务地址")
    .replace(/payload/gi, "请求内容");
}

export function isServiceCredentialError(message: string) {
  return /API\s*Key/i.test(message) || /Bearer\s*token/i.test(message);
}
