export function sanitizeServiceErrorMessage(message: string) {
  return message
    .replace(/API\s*Key/gi, "服务密钥")
    .replace(/Bearer\s*token/gi, "访问凭证")
    .replace(/provider/gi, "服务")
    .replace(/endpoint/gi, "服务地址")
    .replace(/payload/gi, "请求内容");
}

export function isServiceCredentialError(message: string) {
  return /API\s*Key/i.test(message) || /Bearer\s*token/i.test(message);
}
