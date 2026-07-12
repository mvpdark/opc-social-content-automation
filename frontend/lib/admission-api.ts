import { getZscjApiBase } from "@/lib/api-base";

export type AdmissionNotice = {
  id: number;
  source_id: number;
  title: string;
  url: string;
  publish_date: string | null;
  summary: string | null;
  school_name: string | null;
  extract_status: string | null;
};

function isAdmissionNotice(item: unknown): item is AdmissionNotice {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.title === "string" &&
    typeof obj.url === "string" &&
    typeof obj.id === "number" &&
    typeof obj.source_id === "number"
  );
}

export async function fetchAdmissionNotices(
  apiBase: string,
  options: { limit?: number; keyword?: string; signal?: AbortSignal } = {}
): Promise<AdmissionNotice[]> {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 20));
  if (options.keyword?.trim()) {
    params.set("keyword", options.keyword.trim());
  }
  try {
    const response = await fetch(`${apiBase}/admissions/notices?${params.toString()}`, { signal: options.signal });
    if (!response.ok) {
      throw new Error(`Admission notices fetch failed (${response.status})`);
    }
    const data: unknown = await response.json();
    if (Array.isArray(data)) return data.filter(isAdmissionNotice);
    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.items)) return obj.items.filter(isAdmissionNotice);
      if (Array.isArray(obj.list)) return obj.list.filter(isAdmissionNotice);
    }
    return [];
  } catch (error) {
    // ZSCJ 服务（招生/知识库/趋势采集）可能未启动，网络错误时返回空数组而非抛出异常
    if (error instanceof TypeError) {
      if (process.env.NODE_ENV === "development") console.warn("[admission-api] Network error fetching admission notices:", error);
      return [];
    }
    throw error;
  }
}

export function formatNoticeDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.slice(0, 10);
    return `${d.getMonth() + 1}\u6708${d.getDate()}\u65e5`;
  } catch {
    return dateStr.slice(0, 10);
  }
}
