import type { GeneratedContent } from "@/lib/generated-assets";
import {
  XHS_COVER_BASE_HEIGHT,
  XHS_COVER_BASE_WIDTH,
  XHS_COVER_HEIGHT,
  XHS_COVER_WIDTH
} from "@/lib/mobile-cover-share";

export type CoverPalette = {
  accent: string;
  backgroundEnd: string;
  backgroundMid: string;
  backgroundStart: string;
};

const COVER_PALETTES: CoverPalette[] = [
  { accent: "#ff3b30", backgroundEnd: "#ffd9df", backgroundMid: "#d9f1e5", backgroundStart: "#fff7df" },
  { accent: "#2c9758", backgroundEnd: "#dff7ee", backgroundMid: "#f4ead4", backgroundStart: "#ffffff" },
  { accent: "#1d1d1f", backgroundEnd: "#e9efe8", backgroundMid: "#f7e6cd", backgroundStart: "#fffdf7" },
  { accent: "#007aff", backgroundEnd: "#d9e8ff", backgroundMid: "#f5ead9", backgroundStart: "#fffaf0" }
];

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chunkCoverText(value: string, size: number, maxLines: number) {
  const chars = Array.from(value.replace(/\s+/g, "") || "草稿");
  const lines: string[] = [];
  for (let index = 0; index < chars.length && lines.length < maxLines; index += size) {
    lines.push(chars.slice(index, index + size).join(""));
  }
  return lines.length ? lines : ["草稿"];
}

export function buildLocalCoverUrl(content: GeneratedContent): string {
  const palette = COVER_PALETTES[Math.abs(content.id) % COVER_PALETTES.length];
  const titleLines = chunkCoverText(content.title, 7, 3);
  const excerpt = Array.from(content.body.replace(/\s+/g, " ").trim()).slice(0, 24).join("");
  const tag = content.tags?.find((value) => value.trim())?.trim() ?? "草稿";
  const titleSvg = titleLines
    .map(
      (line, index) =>
        `<text x="86" y="${392 + index * 92}" class="title">${escapeSvgText(line)}</text>`
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${XHS_COVER_WIDTH}" height="${XHS_COVER_HEIGHT}" viewBox="0 0 ${XHS_COVER_BASE_WIDTH} ${XHS_COVER_BASE_HEIGHT}">
<defs>
<linearGradient id="cover-bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${palette.backgroundStart}"/>
<stop offset="54%" stop-color="${palette.backgroundMid}"/>
<stop offset="100%" stop-color="${palette.backgroundEnd}"/>
</linearGradient>
<style>
.label{font:800 34px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:${palette.accent}}
.title{font:900 74px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#1d1d1f}
.meta{font:700 30px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#687069}
</style>
</defs>
<rect width="${XHS_COVER_BASE_WIDTH}" height="${XHS_COVER_BASE_HEIGHT}" fill="url(#cover-bg)"/>
<rect x="64" y="74" width="190" height="78" rx="39" fill="rgba(255,255,255,0.78)"/>
<text x="100" y="126" class="label">${escapeSvgText(tag.slice(0, 8))}</text>
<path d="M92 278H808" stroke="${palette.accent}" stroke-width="8" stroke-linecap="round" opacity="0.16"/>
${titleSvg}
<rect x="70" y="812" width="760" height="158" rx="38" fill="rgba(255,255,255,0.54)"/>
<text x="104" y="882" class="meta">${escapeSvgText(excerpt || "本地草稿封面预览")}</text>
<text x="104" y="930" class="meta">本地预览 · 等待真实封面记录</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
