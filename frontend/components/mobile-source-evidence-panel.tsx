"use client";

import { ExternalLink, Loader2, Search } from "lucide-react";

import type { GenerationKnowledgeSource, GenerationSourceContext } from "@/lib/generated-assets";
import {
  knowledgeCategoryLabel,
  knowledgeItemExcerpt,
  knowledgeItemTitle,
  type KnowledgeItem
} from "@/lib/knowledge-api";

function mobileSourceKnowledgeItemToKnowledgeItem(item: GenerationKnowledgeSource): KnowledgeItem {
  return {
    category: item.category ?? null,
    content: item.content,
    id: item.id,
    match_type: item.match_type ?? undefined,
    score: item.score ?? null,
    title: item.title
  };
}

export function MobileSourceEvidencePanel({
  error,
  fallbackKnowledgeQuery,
  onPreview,
  previewBusy,
  sourceContext
}: {
  error?: string | null;
  fallbackKnowledgeQuery?: string;
  onPreview: () => void;
  previewBusy: boolean;
  sourceContext: GenerationSourceContext | null;
}) {
  const knowledgeItems = sourceContext?.knowledge_items ?? [];
  const webSearch = sourceContext?.web_search;
  const webRequired = Boolean(webSearch?.required);
  const webResults = webSearch?.results ?? [];
  const hasEvidence = knowledgeItems.length + webResults.length > 0;
  const missingRequiredWebResults = webRequired && !webResults.length;
  const visibleKnowledgeQuery = sourceContext?.knowledge_query || fallbackKnowledgeQuery?.trim() || "";

  return (
    <div
      className="mt-4 rounded-[24px] border border-white/[0.86] bg-[rgba(255,253,247,0.84)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]"
      data-project-swipe-ignore="true"
      data-testid="mobile-source-evidence"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black text-ink">检索依据</div>
          <p className="mt-1 text-[11px] font-medium leading-5 text-muted">
            生成前后都能看引用来源，确认后再复制发布。
          </p>
        </div>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-[11px] font-black",
            missingRequiredWebResults
              ? "bg-[#fff3d6] text-[#8a6110]"
              : hasEvidence
                ? "bg-[#e7f2ea] text-moss"
                : "bg-white text-muted"
          ].join(" ")}
        >
          {missingRequiredWebResults ? "缺联网" : hasEvidence ? `${knowledgeItems.length + webResults.length} 条` : "待查看"}
        </span>
      </div>
      {visibleKnowledgeQuery ? (
        <p className="mt-2 rounded-[16px] bg-white/70 px-3 py-2 text-[11px] font-medium leading-5 text-muted">
          检索词：{visibleKnowledgeQuery}
        </p>
      ) : null}
      <button
        className="mt-3 flex h-10 w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.92] bg-white/80 text-xs font-black text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] active:scale-[0.99]"
        data-testid="mobile-source-preview-button"
        disabled={previewBusy}
        onClick={onPreview}
        type="button"
      >
        {previewBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        {previewBusy ? "正在检索" : hasEvidence ? "重新查看依据" : "查看检索依据"}
      </button>
      {error ? <p className="mt-2 text-[11px] font-medium leading-5 text-[#c92a3f]">{error}</p> : null}
      {knowledgeItems.length ? (
        <div className="mt-3 space-y-2">
          <div className="text-[11px] font-black text-muted">知识库引用</div>
          {knowledgeItems.slice(0, 3).map((item, index) => {
            const knowledgeItem = mobileSourceKnowledgeItemToKnowledgeItem(item);
            return (
              <article className="rounded-[18px] border border-white/[0.86] bg-white/70 px-3 py-2" key={`${item.id}-${index}`}>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="line-clamp-2 text-xs font-black leading-5 text-ink">
                    {knowledgeItemTitle(knowledgeItem)}
                  </h4>
                  <span className="shrink-0 rounded-full bg-[#e7f2ea] px-2 py-0.5 text-[10px] font-black text-moss">
                    {knowledgeCategoryLabel(knowledgeItem.category)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-3 text-[11px] font-medium leading-5 text-muted">
                  {knowledgeItemExcerpt(knowledgeItem, 120)}
                </p>
              </article>
            );
          })}
        </div>
      ) : null}
      {webRequired ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-black text-muted">联网来源</div>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-muted">
              {webResults.length ? `${webResults.length} 条` : "未返回"}
            </span>
          </div>
          {webSearch?.query ? (
            <p className="break-words rounded-[16px] bg-white/70 px-3 py-2 text-[11px] font-medium leading-5 text-muted">
              Tavily 查询：{webSearch.query}
            </p>
          ) : null}
          {webSearch?.answer ? (
            <p className="rounded-[16px] border border-white/[0.86] bg-white/80 px-3 py-2 text-[11px] font-medium leading-5 text-ink">
              <span className="font-black text-moss">Tavily 摘要：</span>
              {webSearch.answer}
              <span className="mt-1 block text-muted">摘要仅作线索，发布前请点开下方 URL 核对原文。</span>
            </p>
          ) : null}
          {webResults.length ? (
            webResults.slice(0, 3).map((item, index) => (
              <a
                className="block rounded-[18px] border border-white/[0.86] bg-white/70 px-3 py-2"
                href={item.url}
                key={`${item.url}-${item.title}-${index}`}
                rel="noreferrer"
                target="_blank"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="line-clamp-2 text-xs font-black leading-5 text-ink">{item.title}</h4>
                  <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted" />
                </div>
                <p className="mt-1 truncate text-[10px] font-medium text-moss">{item.url}</p>
                <p className="mt-1 line-clamp-3 text-[11px] font-medium leading-5 text-muted">{item.content}</p>
              </a>
            ))
          ) : (
            <p className="rounded-[18px] border border-[#f3dca3] bg-[#fff8e6] px-3 py-2 text-[11px] font-medium leading-5 text-[#8a6110]">
              这个选题需要实时资料，但本次还没拿到可见联网来源；请换关键词、检查 Tavily，或只写核验框架，不要直接写学校、价格、logo 或排名结论。
            </p>
          )}
        </div>
      ) : null}
      {sourceContext?.review_note ? (
        <div className="mt-3 border-l-4 border-[#f0c76b] pl-3 text-[11px] font-medium leading-5 text-muted">
          {sourceContext.review_note}
        </div>
      ) : null}
    </div>
  );
}
