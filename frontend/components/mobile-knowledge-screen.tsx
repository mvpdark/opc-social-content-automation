"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, BookOpenText, Clipboard, Loader2, Search } from "lucide-react";

import { MobilePanel } from "@/components/mobile-ui";
import { copyText } from "@/lib/clipboard";
import {
  fetchKnowledgeItems,
  knowledgeCategoryLabel,
  knowledgeItemContent,
  knowledgeItemExcerpt,
  knowledgeItemTitle,
  type KnowledgeItem
} from "@/lib/knowledge-api";

export function KnowledgeScreen({
  apiBase,
  onAction
}: {
  apiBase: string;
  onAction: (message: string) => void;
}) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [status, setStatus] = useState("正在读取最近入库内容...");

  async function loadKnowledge(nextQuery = query, announce = false) {
    const normalizedQuery = nextQuery.trim();
    setLoading(true);
    setStatus(normalizedQuery ? "正在搜索知识库..." : "正在读取最近入库内容...");
    try {
      const data = await fetchKnowledgeItems(apiBase, {
        limit: 20,
        query: normalizedQuery
      });
      setItems(data);
      const nextStatus = data.length
        ? normalizedQuery
          ? `找到 ${data.length} 条相关知识。`
          : `已显示最近 ${data.length} 条知识。`
        : normalizedQuery
          ? "没有找到匹配知识，可以换个关键词。"
            : "知识库还没有条目，先从采集页保存知识摘要。";
      setStatus(nextStatus);
      if (announce) {
        onAction(nextStatus);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "知识库读取失败，请稍后再试。";
      setItems([]);
      setStatus(message);
      if (announce) {
        onAction(message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadKnowledge("");
  }, []);

  async function copyKnowledgeItem(item: KnowledgeItem) {
    try {
      await copyText(`${knowledgeItemTitle(item)}\n\n${knowledgeItemContent(item)}`);
      onAction("知识条目已复制到剪贴板。");
    } catch (error) {
      onAction(error instanceof Error ? error.message : "复制失败，请手动选择内容。");
    }
  }

  function openKnowledgeItem(item: KnowledgeItem) {
    setSelectedItem(item);
    onAction("已打开知识条目详情。");
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadKnowledge(query, true);
  }

  return (
    <div className="space-y-4">
      <section className="relative mt-8 overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] p-5 text-ink shadow-[0_18px_42px_rgba(31,58,49,0.11),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
        <div aria-hidden="true" className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-[#70b47d]/[0.18] blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black text-moss">已入库素材</div>
              <h2 className="mt-1 text-[28px] font-black leading-8">知识库</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-muted">
                查看采集后保存的知识摘要，创作时优先引用这里的事实。
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/[0.84] bg-[#e7f2ea] text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
              <BookOpenText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[22px] bg-[rgba(255,255,255,0.72)] px-3 py-3">
              <div className="text-[20px] font-black text-ink">{items.length}</div>
              <div className="mt-1 text-[11px] font-bold text-muted">当前显示</div>
            </div>
            <div className="rounded-[22px] bg-[#e7f2ea]/[0.82] px-3 py-3">
              <div className="text-[20px] font-black text-moss">{query.trim() ? "搜索" : "最近"}</div>
              <div className="mt-1 text-[11px] font-bold text-muted">查看模式</div>
            </div>
          </div>
        </div>
      </section>

      <MobilePanel title="搜索知识库">
        <form className="space-y-3" onSubmit={submitSearch}>
          <label className="block">
            <span className="text-xs font-bold text-muted">关键词</span>
            <div className="mt-2 flex h-[50px] items-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.92)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input
                className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none"
                data-testid="mobile-knowledge-search-input"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="例如：水博 排名 学校"
                value={query}
              />
            </div>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full bg-[#2f9a55] text-sm font-black text-white shadow-[0_14px_28px_rgba(47,154,85,0.22)] active:scale-[0.99] disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              搜索
            </button>
            <button
              className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] text-sm font-black text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] active:scale-[0.99] disabled:opacity-60"
              disabled={loading}
              onClick={() => {
                setQuery("");
                void loadKnowledge("", true);
              }}
              type="button"
            >
              <BookOpenText className="h-4 w-4" />
              最近
            </button>
          </div>
          <p className="text-xs font-semibold leading-5 text-muted" data-testid="mobile-knowledge-status">
            {status}
          </p>
        </form>
      </MobilePanel>

      <MobilePanel action={`${items.length} 条`} title="知识条目">
        <div className="space-y-3" data-testid="mobile-knowledge-list">
          {items.map((item) => (
            <article
              aria-label={`查看知识条目：${knowledgeItemTitle(item)}`}
              className="touch-manipulation cursor-pointer overflow-hidden rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.88)] p-3 shadow-[0_10px_24px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.86)] outline-none transition active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-moss/30"
              data-testid="mobile-knowledge-item"
              key={item.id}
              onClick={() => openKnowledgeItem(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openKnowledgeItem(item);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-[11px] font-black text-moss">#{item.id}</span>
                  <span className="max-w-[132px] truncate rounded-full bg-[#e7f2ea]/[0.92] px-2 py-1 text-[10px] font-black text-moss">
                    {knowledgeCategoryLabel(item.category)}
                  </span>
                </div>
                <h3 className="mt-2 line-clamp-2 break-words text-[15px] font-black leading-5">{knowledgeItemTitle(item)}</h3>
              </div>
              <p className="mt-2 line-clamp-3 break-words text-[12px] font-semibold leading-5 text-muted">
                {knowledgeItemExcerpt(item, 116)}
              </p>
              <button
                className="mt-3 flex h-9 w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.84] bg-white/[0.72] text-xs font-black text-ink active:scale-[0.99]"
                onClick={(event) => {
                  event.stopPropagation();
                  void copyKnowledgeItem(item);
                }}
                type="button"
              >
                <Clipboard className="h-4 w-4" />
                复制条目
              </button>
            </article>
          ))}
          {!loading && items.length === 0 ? (
            <div className="rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 py-5 text-sm font-semibold leading-6 text-muted">
              这里还没有可以显示的知识。先到采集页确认来源，再保存知识摘要。
            </div>
          ) : null}
        </div>
      </MobilePanel>

      {selectedItem ? (
        <div
          className="fixed inset-0 z-[90] flex items-end bg-black/25 px-4 pb-[calc(92px+env(safe-area-inset-bottom))] pt-20 backdrop-blur-sm"
          data-testid="mobile-knowledge-detail"
          onClick={() => setSelectedItem(null)}
          role="presentation"
        >
          <section
            aria-label="知识条目详情"
            className="max-h-[78vh] w-full overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.97)] shadow-[0_22px_52px_rgba(31,58,49,0.20),inset_0_1px_0_rgba(255,255,255,0.92)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-moss/10 px-4 py-4">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-[11px] font-black text-moss">#{selectedItem.id}</span>
                  <span className="max-w-[150px] truncate rounded-full bg-[#e7f2ea]/[0.92] px-2 py-1 text-[10px] font-black text-moss">
                    {knowledgeCategoryLabel(selectedItem.category)}
                  </span>
                </div>
                <h3 className="mt-2 break-words text-lg font-black leading-6 text-ink">{knowledgeItemTitle(selectedItem)}</h3>
              </div>
              <button
                aria-label="关闭知识详情"
                className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/[0.84] bg-white/[0.76] text-ink active:scale-[0.98]"
                onClick={() => setSelectedItem(null)}
                type="button"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[44vh] overflow-y-auto px-4 py-4">
              <p className="whitespace-pre-wrap break-words text-[13px] font-semibold leading-6 text-muted">
                {knowledgeItemContent(selectedItem)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-moss/10 px-4 py-4">
              <button
                className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full bg-[#2f9a55] text-sm font-black text-white shadow-[0_14px_28px_rgba(47,154,85,0.22)] active:scale-[0.99]"
                onClick={() => void copyKnowledgeItem(selectedItem)}
                type="button"
              >
                <Clipboard className="h-4 w-4" />
                复制
              </button>
              <button
                className="flex h-11 touch-manipulation items-center justify-center rounded-full border border-white/[0.84] bg-white/[0.76] text-sm font-black text-ink active:scale-[0.99]"
                onClick={() => setSelectedItem(null)}
                type="button"
              >
                关闭
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
