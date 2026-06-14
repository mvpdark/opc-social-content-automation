"use client";

import { ChevronDown, ExternalLink, Loader2, Search } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { GenerationKnowledgeSource, GenerationSourceContext } from "@/lib/generated-assets";
import {
  knowledgeCategoryLabel,
  knowledgeItemExcerpt,
  knowledgeItemTitle,
  type KnowledgeItem
} from "@/lib/knowledge-api";

const secondaryButtonClass =
  "glass-control flex items-center justify-center gap-2 rounded-md border text-sm font-medium text-ink";

const pillTone = {
  neutral: "border-line bg-mist text-muted",
  green: "border-moss/40 bg-moss/10 text-ink",
  amber: "border-amber/40 bg-amber/10 text-ink"
} satisfies Record<string, string>;

function SourcePill({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: keyof typeof pillTone;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${pillTone[tone]}`}>
      {children}
    </span>
  );
}

function sourceKnowledgeItemToKnowledgeItem(item: GenerationKnowledgeSource): KnowledgeItem {
  return {
    category: item.category ?? null,
    content: item.content,
    id: item.id,
    match_type: item.match_type ?? undefined,
    score: item.score ?? null,
    title: item.title
  };
}

function sourceContextStats(sourceContext: GenerationSourceContext | null) {
  const knowledgeCount = sourceContext?.knowledge_items?.length ?? 0;
  const webCount = sourceContext?.web_search?.results?.length ?? 0;
  return {
    hasEvidence: knowledgeCount + webCount > 0,
    knowledgeCount,
    webCount
  };
}

type EvidenceSection = "knowledge" | "web" | null;

export function GenerationSourceEvidenceCard({
  disabled = false,
  error,
  fallbackKnowledgeQuery,
  onPreview,
  previewBusy,
  sourceContext
}: {
  disabled?: boolean;
  error?: string | null;
  fallbackKnowledgeQuery?: string;
  onPreview?: () => void;
  previewBusy?: boolean;
  sourceContext: GenerationSourceContext | null;
}) {
  const { hasEvidence, knowledgeCount, webCount } = sourceContextStats(sourceContext);
  const webSearch = sourceContext?.web_search;
  const webRequired = Boolean(webSearch?.required);
  const webResults = webSearch?.results ?? [];
  const knowledgeItems = sourceContext?.knowledge_items ?? [];
  const missingRequiredWebResults = webRequired && !webResults.length;
  const visibleKnowledgeQuery = sourceContext?.knowledge_query || fallbackKnowledgeQuery?.trim() || "";
  const [openEvidenceSection, setOpenEvidenceSection] = useState<EvidenceSection>(null);
  const webEvidenceCountLabel = webResults.length ? `${webResults.length} 条` : webRequired ? "未返回" : "未启用";

  return (
    <div className="mt-4 rounded-md border border-line bg-paper/70 p-3" data-testid="generation-source-evidence">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-ink">检索依据</div>
          <p className="mt-1 text-xs leading-5 text-muted">
            人工确认前先看这里：点击知识库引用或联网搜索展开核对。
          </p>
        </div>
        <SourcePill tone={missingRequiredWebResults ? "amber" : hasEvidence ? "green" : "neutral"}>
          {missingRequiredWebResults ? "缺联网" : hasEvidence ? `${knowledgeCount + webCount} 条` : "待查看"}
        </SourcePill>
      </div>
      {visibleKnowledgeQuery ? (
        <div className="mt-3 rounded-md bg-mist/70 px-3 py-2 text-[11px] leading-5 text-muted">
          检索词：{visibleKnowledgeQuery}
        </div>
      ) : null}
      {onPreview ? (
        <button
          className={`${secondaryButtonClass} mt-3 h-9 w-full disabled:cursor-not-allowed disabled:opacity-60`}
          data-testid="source-preview-button"
          disabled={disabled || previewBusy}
          onClick={onPreview}
          type="button"
        >
          {previewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {previewBusy ? "正在检索" : hasEvidence ? "重新查看检索依据" : "查看检索依据"}
        </button>
      ) : null}
      {error ? <p className="mt-2 text-xs leading-5 text-coral">{error}</p> : null}
      <div className="mt-3 rounded-md border border-line bg-mist/45 p-1.5" data-testid="source-evidence-switcher">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            aria-controls="source-knowledge-list"
            aria-expanded={openEvidenceSection === "knowledge"}
            className={[
              "flex min-h-12 items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition",
              openEvidenceSection === "knowledge" ? "bg-paper text-ink shadow-sm" : "bg-paper/60 text-muted hover:bg-paper"
            ].join(" ")}
            data-testid="source-knowledge-toggle"
            onClick={() => setOpenEvidenceSection(openEvidenceSection === "knowledge" ? null : "knowledge")}
            type="button"
          >
            <span>
              <span className="block text-xs font-semibold">知识库引用</span>
              <span className="mt-0.5 block text-[11px] text-moss">{knowledgeItems.length} 条</span>
            </span>
            <ChevronDown
              className={[
                "h-4 w-4 shrink-0 transition-transform",
                openEvidenceSection === "knowledge" ? "rotate-180" : ""
              ].join(" ")}
            />
          </button>
          <button
            aria-controls="source-web-list"
            aria-expanded={openEvidenceSection === "web"}
            className={[
              "flex min-h-12 items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition",
              openEvidenceSection === "web" ? "bg-paper text-ink shadow-sm" : "bg-paper/60 text-muted hover:bg-paper"
            ].join(" ")}
            data-testid="source-web-toggle"
            onClick={() => setOpenEvidenceSection(openEvidenceSection === "web" ? null : "web")}
            type="button"
          >
            <span>
              <span className="block text-xs font-semibold">联网搜索</span>
              <span className="mt-0.5 block text-[11px] text-moss">{webEvidenceCountLabel}</span>
            </span>
            <ChevronDown
              className={["h-4 w-4 shrink-0 transition-transform", openEvidenceSection === "web" ? "rotate-180" : ""].join(
                " "
              )}
            />
          </button>
        </div>
      </div>
      {openEvidenceSection === "knowledge" ? (
        <div className="mt-3 space-y-2" data-testid="source-knowledge-list" id="source-knowledge-list">
          {knowledgeItems.length ? (
            knowledgeItems.slice(0, 4).map((item, index) => {
              const knowledgeItem = sourceKnowledgeItemToKnowledgeItem(item);
              return (
                <article className="rounded-md border border-line bg-mist/55 p-3" key={`${item.id}-${index}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="line-clamp-2 text-xs font-semibold leading-5 text-ink">
                      {knowledgeItemTitle(knowledgeItem)}
                    </h4>
                    <SourcePill>{knowledgeCategoryLabel(knowledgeItem.category)}</SourcePill>
                  </div>
                  <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-muted">
                    {knowledgeItemExcerpt(knowledgeItem, 150)}
                  </p>
                </article>
              );
            })
          ) : (
            <p className="rounded-md border border-line bg-mist/55 px-3 py-2 text-[11px] leading-5 text-muted">
              暂无知识库引用，请先点击“查看检索依据”。
            </p>
          )}
        </div>
      ) : null}
      {openEvidenceSection === "web" ? (
        <div className="mt-3 space-y-2" data-testid="source-web-list" id="source-web-list">
          {webSearch?.query ? (
            <p className="break-words rounded-md bg-mist/70 px-3 py-2 text-[11px] leading-5 text-muted">
              Tavily 查询：{webSearch.query}
            </p>
          ) : null}
          {webSearch?.answer ? (
            <p className="rounded-md border border-line bg-paper px-3 py-2 text-[11px] leading-5 text-ink">
              <span className="font-semibold text-moss">Tavily 摘要：</span>
              {webSearch.answer}
              <span className="mt-1 block text-muted">摘要仅作线索，发布前请点开下方 URL 核对原文。</span>
            </p>
          ) : null}
          {webResults.length ? (
            webResults.slice(0, 4).map((item, index) => (
              <a
                className="block rounded-md border border-line bg-mist/55 p-3 transition hover:border-steel/60"
                href={item.url}
                key={`${item.url}-${item.title}-${index}`}
                rel="noreferrer"
                target="_blank"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="line-clamp-2 text-xs font-semibold leading-5 text-ink">{item.title}</h4>
                  <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted" />
                </div>
                <p className="mt-1 truncate text-[11px] text-steel">{item.url}</p>
                <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-muted">{item.content}</p>
              </a>
            ))
          ) : (
            <p className="rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-[11px] leading-5 text-[#8a6110]">
              {webRequired
                ? "这个选题需要实时资料，但本次还没有可见联网搜索结果；请先换关键词、检查 Tavily，或只写核验框架，不要直接写学校、价格、logo 或排名结论。"
                : "当前选题未触发联网搜索；如涉及学校、价格、logo、排名或市场信息，请先重新查看依据。"}
            </p>
          )}
        </div>
      ) : null}
      {sourceContext?.review_note ? (
        <div className="mt-3 border-l-4 border-amber pl-3 text-[11px] leading-5 text-muted">
          {sourceContext.review_note}
        </div>
      ) : null}
    </div>
  );
}
