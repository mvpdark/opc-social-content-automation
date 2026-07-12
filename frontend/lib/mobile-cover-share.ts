import type { DraftPreviewState } from "@/lib/mobile-draft-storage";
import type { OmpcAndroidBridge } from "@/lib/mobile-runtime";

export const XHS_COVER_WIDTH = 2048;
export const XHS_COVER_HEIGHT = 2736;
export const XHS_COVER_BASE_WIDTH = 900;
export const XHS_COVER_BASE_HEIGHT = 1200;

export function sanitizeFilename(value: string) {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 40) || "xiaohongshu-cover"
  );
}

export function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const lines: string[] = [];
  let currentLine = "";
  for (const char of text) {
    const nextLine = `${currentLine}${char}`;
    if (context.measureText(nextLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char;
      if (lines.length >= maxLines) {
        return lines;
      }
      continue;
    }
    currentLine = nextLine;
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        image.src = "";
        reject(new Error("封面图加载超时。"));
      }
    }, 15000);
    image.onload = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(image);
      }
    };
    image.onerror = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timeoutId);
        reject(new Error("封面图读取失败。"));
      }
    };
    image.src = src;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("封面图导出失败。"));
    }, "image/png");
  });
}

async function buildCoverFileFromImage(src: string, title: string) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || XHS_COVER_WIDTH;
  canvas.height = image.naturalHeight || XHS_COVER_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("浏览器不支持封面图处理。");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToPngBlob(canvas);
  return new File([blob], `${sanitizeFilename(title)}.png`, { type: "image/png" });
}

export async function buildFallbackCoverFile(draft: DraftPreviewState) {
  const canvas = document.createElement("canvas");
  canvas.width = XHS_COVER_WIDTH;
  canvas.height = XHS_COVER_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("浏览器不支持封面图处理。");
  }
  context.scale(canvas.width / XHS_COVER_BASE_WIDTH, canvas.height / XHS_COVER_BASE_HEIGHT);
  const gradient = context.createLinearGradient(0, 0, XHS_COVER_BASE_WIDTH, XHS_COVER_BASE_HEIGHT);
  gradient.addColorStop(0, "#fff7df");
  gradient.addColorStop(0.52, "#d9f1e5");
  gradient.addColorStop(1, "#f7cdbf");
  context.fillStyle = gradient;
  context.fillRect(0, 0, XHS_COVER_BASE_WIDTH, XHS_COVER_BASE_HEIGHT);

  context.fillStyle = "#0f1412";
  context.font = "800 72px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  const titleLines = wrapCanvasText(context, draft.title, 760, 4);
  titleLines.forEach((line, index) => {
    context.fillText(line, 72, 220 + index * 92);
  });

  context.font = "700 34px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  draft.points.slice(0, 3).forEach((point, index) => {
    const y = 760 + index * 112;
    context.fillStyle = "rgba(255,255,255,0.9)";
    context.beginPath();
    context.roundRect(72, y, 756, 78, 18);
    context.fill();
    context.fillStyle = "#0f1412";
    context.fillText(`${index + 1}. ${point}`, 110, y + 50);
  });

  const blob = await canvasToPngBlob(canvas);
  return new File([blob], `${sanitizeFilename(draft.title)}.png`, { type: "image/png" });
}

export async function buildXhsCoverFile(coverImageUrl: string | null, draft: DraftPreviewState) {
  if (coverImageUrl) {
    try {
      return await buildCoverFileFromImage(coverImageUrl, draft.title);
    } catch (_error) {
      return buildFallbackCoverFile(draft);
    }
  }
  return buildFallbackCoverFile(draft);
}

let downloadRevokeCleanup: (() => void) | null = null;

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (downloadRevokeCleanup) {
    downloadRevokeCleanup();
    downloadRevokeCleanup = null;
  }
  const revokeTimer = window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  const unloadListener = () => {
    window.clearTimeout(revokeTimer);
    URL.revokeObjectURL(url);
  };
  window.addEventListener("pagehide", unloadListener, { once: true });
  downloadRevokeCleanup = () => {
    window.removeEventListener("pagehide", unloadListener);
    window.clearTimeout(revokeTimer);
    URL.revokeObjectURL(url);
  };
}

function readFileAsBase64Payload(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, payload] = result.split(",", 2);
      if (!payload) {
        reject(new Error("封面图转交给 App 失败。"));
        return;
      }
      resolve(payload);
    };
    reader.onerror = () => reject(new Error("封面图读取失败。"));
    reader.readAsDataURL(file);
  });
}

export function getOmpcAndroidBridge() {
  if (typeof window === "undefined") {
    return null;
  }
  const bridge = window.OMPCAndroid;
  return bridge && typeof bridge.shareToXiaohongshu === "function" ? bridge : null;
}

export async function shareToNativeXiaohongshu(title: string, text: string, coverFile: File) {
  const bridge = getOmpcAndroidBridge();
  if (!bridge) {
    return { ok: false, message: "当前不是 OMPC App，继续使用浏览器分享。" };
  }
  const imageBase64 = await readFileAsBase64Payload(coverFile);
  let result: unknown;
  try {
    result = bridge.shareToXiaohongshu(title, text, imageBase64, coverFile.name);
  } catch (_bridgeError) {
    return { ok: false, message: "\u5c0f\u7ea2\u4e66\u539f\u751f\u5206\u4eab\u5f02\u5e38\uff0c\u7ee7\u7eed\u4f7f\u7528\u7cfb\u7edf\u5206\u4eab\u3002" };
  }
  const resultText = typeof result === "string" ? result : "";
  if (resultText === "ok") {
    return { ok: true, message: "已交给小红书：封面图、标题和正文已一起发送，正文也已复制兜底。" };
  }
  return {
    ok: false,
    message: resultText.startsWith("error:") ? resultText.slice(6) : "小红书原生分享失败，继续使用系统分享。"
  };
}

declare global {
  interface Window {
    OMPCAndroid?: OmpcAndroidBridge;
  }
}
