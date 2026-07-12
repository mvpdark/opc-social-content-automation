import { sanitizeServiceErrorMessage } from "@/lib/service-error-copy";

export type MobilePlatform = "douyin" | "xiaohongshu";

export type MobileTab = "home" | "collect" | "knowledge" | "review" | "create" | "settings";

export type CredentialSettings = {
  draftApiKey: string;
  imageApiKey: string;
  rewriteApiKey: string;
  workspaceToken: string;
};

export type OmpcAndroidBridge = {
  shareToXiaohongshu: (
    title: string,
    text: string,
    imageBase64: string,
    fileName: string
  ) => string | null | undefined;
};

export const MOBILE_AUTH_STORAGE_KEY = "opc_mobile_auth_v1";
export const CREDENTIAL_STORAGE_KEY = "opc_mobile_credentials_v1";
export const COLLECTION_SCHEDULE_STORAGE_KEY = "opc_mobile_collection_schedule_v1";

export const emptyCredentials: CredentialSettings = {
  draftApiKey: "",
  imageApiKey: "",
  rewriteApiKey: "",
  workspaceToken: ""
};

export function authHeaders(credentials: CredentialSettings) {
  return {
    "Content-Type": "application/json",
    ...(credentials.workspaceToken.trim()
      ? { Authorization: `Bearer ${credentials.workspaceToken.trim()}` }
      : {})
  };
}

export async function readApiError(response: Response, fallback: string) {
  const errorBody = (await response.json().catch(() => null)) as
    | { detail?: unknown; message?: unknown }
    | null;
  if (errorBody?.detail === "database_unavailable") {
    return "数据库暂时不可用：安装包或本地运行请重新启动；自部署模式请检查数据库连接设置和数据库服务。";
  }
  return sanitizeServiceErrorMessage(errorBody?.message ?? errorBody?.detail ?? fallback);
}

export function readMobileStorage(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

export function writeMobileStorage(key: string, value: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (_error) {
    return false;
  }
}

export function removeMobileStorage(key: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (_error) {
    return false;
  }
}
