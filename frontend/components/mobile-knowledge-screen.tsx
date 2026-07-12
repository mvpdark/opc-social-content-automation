"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, BookOpenText, Clipboard, Loader2, Search } from "lucide-react";

import { MobilePanel } from "@/components/mobile-ui";
import { copyText } from "@/lib/clipboard";
import { addMobileBackHandler } from "@/lib/mobile-back-navigation";
import {
  fetchKnowledgeItems,
  knowledgeCategoryLabel,
  knowledgeItemContent,
  knowledgeItemExcerpt,
  knowledgeItemTitle,
  type KnowledgeItem
} from "@/lib/knowledge-api";
import { getZscjApiBase } from "@/lib/api-base";
import { fetchAdmissionNotices, formatNoticeDate, type AdmissionNotice } from "@/lib/admission-api";
import { GraduationCap, ExternalLink } from "lucide-react";

export const KnowledgeScreen = memo(function KnowledgeScreen({
  active = true,
  onAction
}: {
  active?: boolean;
  onAction: (message: string) => void;
}) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [status, setStatus] = useState("正在读取最近入库内容...");
  const [notices, setNotices] = useState<AdmissionNotice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [subTab, setSubTab] = useState<"knowledge" | "admission">("knowledge");
  const [noticeQuery, setNoticeQuery] = useState("");
  const activeRef = useRef(true);
  const requestIdRef = useRef(0);
  const noticesRequestIdRef = useRef(0);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return addMobileBackHandler(() => {
      if (!active || !selectedItem) {
        return false;
      }
      setSelectedItem(null);
      onAction("已关闭知识详情。");
      return true;
    });
  }, [active, onAction, selectedItem]);

  const loadKnowledge = useCallback(async function loadKnowledge(nextQuery: string = "", announce = false, signal?: AbortSignal) {
    const requestId = ++requestIdRef.current;
    const normalizedQuery = nextQuery.trim();
    setLoading(true);
    setStatus(normalizedQuery ? "正在搜索知识库..." : "正在读取最近入库内容...");
    try {
      const data = await fetchKnowledgeItems(getZscjApiBase(), {
        limit: 20,
        query: normalizedQuery,
        signal
      });
      if (!activeRef.current || requestIdRef.current !== requestId) return;
      setItems(data);
      setSelectedItem((currentItem) =>
        currentItem && data.some((item) => item.id === currentItem.id) ? currentItem : null
      );
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
      if (error instanceof Error && error.name === "AbortError") return;
      const message = error instanceof Error ? error.message : "知识库读取失败，请稍后再试。";
      if (!activeRef.current || requestIdRef.current !== requestId) return;
      setItems([]);
      setSelectedItem(null);
      setStatus(message);
      if (announce) {
        onAction(message);
      }
    } finally {
      if (activeRef.current && requestIdRef.current === requestId) setLoading(false);
    }
  }, [onAction]);

  const loadNotices = useCallback(async function loadNotices(signal?: AbortSignal) {
    const requestId = ++noticesRequestIdRef.current;
    setNoticesLoading(true);
    try {
      const data = await fetchAdmissionNotices(getZscjApiBase(), { limit: 30, signal });
      if (!activeRef.current || noticesRequestIdRef.current !== requestId) return;
      setNotices(data);
    } catch {
      if (activeRef.current && noticesRequestIdRef.current === requestId) setNotices([]);
    } finally {
      if (activeRef.current && noticesRequestIdRef.current === requestId) setNoticesLoading(false);
    }
  }, []);

  const filteredNotices = useMemo(() => {
    const normalized = noticeQuery.trim().toLowerCase();
    if (!normalized) return notices;
    return notices.filter(
      (n) =>
        n.title.toLowerCase().includes(normalized) ||
        (n.school_name?.toLowerCase().includes(normalized) ?? false) ||
        (n.summary?.toLowerCase().includes(normalized) ?? false)
    );
  }, [notices, noticeQuery]);

  const schoolNames = useMemo(
    () =>
      Array.from(
        new Set(notices.map((n) => n.school_name).filter((s): s is string => Boolean(s)))
      ).sort(),
    [notices]
  );

  useEffect(() => {
    activeRef.current = true;
    const controller = new AbortController();
    void loadKnowledge("", false, controller.signal);
    void loadNotices(controller.signal);
    return () => {
      activeRef.current = false;
      searchAbortRef.current?.abort();
      controller.abort();
    };
  }, [loadKnowledge, loadNotices]);

  const copyKnowledgeItem = useCallback(async (item: KnowledgeItem) => {
    try {
      await copyText(`${knowledgeItemTitle(item)}\n\n${knowledgeItemContent(item)}`);
      onAction("知识条目已复制到剪贴板。");
    } catch (error) {
      onAction(error instanceof Error ? error.message : "复制失败，请手动选择内容。");
    }
  }, [onAction]);

  const openKnowledgeItem = useCallback((item: KnowledgeItem) => {
    setSelectedItem(item);
    onAction("已打开知识条目详情。");
  }, [onAction]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    void loadKnowledge(query, true, controller.signal);
  }

  const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedItem(null);
  }, []);

  return (
    <div className="space-y-4">
      <section className="relative mt-8 overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] p-5 text-ink shadow-[0_18px_42px_rgba(31,58,49,0.11),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
        <div aria-hidden="true" className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-moss/[0.18] blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black text-moss">已入库素材</div>
              <h2 className="mt-1 text-[22px] font-black leading-7">知识库</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-muted">
                查看采集后保存的知识摘要，创作时优先引用这里的事实。
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/[0.84] bg-sage text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
              <BookOpenText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[22px] bg-[rgba(255,255,255,0.72)] px-3 py-3">
              <div className="text-[20px] font-black text-ink">{items.length}</div>
              <div className="mt-1 text-[11px] font-bold text-muted">当前显示</div>
            </div>
            <div className="rounded-[22px] bg-sage/[0.82] px-3 py-3">
              <div className="text-[20px] font-black text-moss">{query.trim() ? "搜索" : "最近"}</div>
              <div className="mt-1 text-[11px] font-bold text-muted">查看模式</div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] p-1 shadow-[0_10px_24px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.86)]">
        <button
          className={`flex-1 rounded-full py-2.5 text-sm font-black transition active:scale-[0.98] ${
            subTab === "knowledge"
              ? "bg-moss text-white shadow-[0_8px_20px_rgba(47,154,85,0.22)]"
              : "text-muted"
          }`}
          onClick={() => setSubTab("knowledge")}
          type="button"
        >
          知识条目
        </button>
        <button
          className={`flex-1 rounded-full py-2.5 text-sm font-black transition active:scale-[0.98] ${
            subTab === "admission"
              ? "bg-moss text-white shadow-[0_8px_20px_rgba(47,154,85,0.22)]"
              : "text-muted"
          }`}
          onClick={() => setSubTab("admission")}
          type="button"
        >
          大学通告
        </button>
      </div>

      {subTab === "knowledge" ? (
        <>
      <MobilePanel title="搜索知识库">
        <form className="space-y-3" onSubmit={submitSearch}>
          <label className="block">
            <span className="text-xs font-bold text-muted">关键词</span>
            <div className="mt-2 flex h-[50px] items-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.92)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input
                className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none"
                name="knowledge-search" data-testid="mobile-knowledge-search-input"
                onChange={handleQueryChange}
                placeholder="例如：水博 排名 学校"
                value={query}
              />
            </div>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full bg-moss text-sm font-black text-white shadow-[0_14px_28px_rgba(47,154,85,0.22)] active:scale-[0.99] disabled:opacity-60"
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
                searchAbortRef.current?.abort();
                const controller = new AbortController();
                searchAbortRef.current = controller;
                void loadKnowledge("", true, controller.signal);
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
                  <span className="max-w-[132px] truncate rounded-full bg-sage/[0.92] px-2 py-1 text-[10px] font-black text-moss">
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
        </>
      ) : null}

      {subTab === "admission" ? (
        <>
      <MobilePanel title="搜索通告">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); }}>
          <label className="block">
            <span className="text-xs font-bold text-muted">大学名称 / 关键词</span>
            <div className="mt-2 flex h-[50px] items-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.92)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input
                className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none"
                name="admission-search"
                data-testid="mobile-admission-search-input"
                onChange={(e) => setNoticeQuery(e.target.value)}
                placeholder="输入大学名称快速筛选"
                value={noticeQuery}
              />
              {noticeQuery ? (
                <button
                  className="shrink-0 text-xs font-black text-muted active:scale-95"
                  onClick={() => setNoticeQuery("")}
                  type="button"
                >
                  清除
                </button>
              ) : null}
            </div>
          </label>
          <p className="text-xs font-semibold leading-5 text-muted" data-testid="mobile-admission-status">
            {noticeQuery.trim()
              ? `筛选「${noticeQuery.trim()}」：${filteredNotices.length} 条结果`
              : `共 ${notices.length} 条通告，输入大学名称快速筛选`}
          </p>
        </form>
      </MobilePanel>

      {schoolNames.length > 0 ? (
        <MobilePanel title="快速选择学校">
          <div className="flex flex-wrap gap-2">
            {schoolNames.map((name) => (
              <button
                key={name}
                className={`rounded-full px-3 py-1.5 text-[11px] font-black transition active:scale-[0.98] ${
                  noticeQuery === name
                    ? "bg-moss text-white shadow-[0_6px_16px_rgba(47,154,85,0.22)]"
                    : "border border-white/[0.84] bg-[rgba(255,253,247,0.88)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
                }`}
                onClick={() => setNoticeQuery(name)}
                type="button"
              >
                {name}
              </button>
            ))}
          </div>
        </MobilePanel>
      ) : null}

      <MobilePanel action={`${filteredNotices.length} 条`} title="大学通告">
        <div className="space-y-3" data-testid="mobile-admission-list">
          {noticesLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 py-5 text-sm font-semibold text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在加载大学通告...
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-4 py-5 text-sm font-semibold leading-6 text-muted">
              {notices.length === 0 ? "暂无大学通告数据。" : "没有匹配的通告，试试其他关键词。"}
            </div>
          ) : (
            filteredNotices.map((notice) => (
              <a
                key={notice.id}
                href={notice.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block touch-manipulation overflow-hidden rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.88)] p-3 shadow-[0_10px_24px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.86)] transition active:scale-[0.995]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage text-moss">
                    <GraduationCap className="h-3.5 w-3.5" />
                  </span>
                  <span className="shrink-0 rounded-full bg-moss/[0.12] px-2 py-1 text-[10px] font-black text-moss">
                    {notice.school_name || "高校"}
                  </span>
                  {notice.publish_date ? (
                    <span className="ml-auto shrink-0 text-[10px] font-bold text-muted">
                      {formatNoticeDate(notice.publish_date)}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 line-clamp-2 break-words text-[13px] font-black leading-5">
                  {notice.title}
                </h3>
                {notice.summary ? (
                  <p className="mt-1 line-clamp-2 break-words text-[11px] font-semibold leading-4 text-muted">
                    {notice.summary}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-moss">
                  <ExternalLink className="h-3 w-3" />
                  查看原文
                </div>
              </a>
            ))
          )}
        </div>
      </MobilePanel>
        </>
      ) : null}

      {selectedItem ? (
        <div
          className="fixed inset-0 z-[90] flex items-end bg-black/25 px-4 pb-[calc(92px+env(safe-area-inset-bottom))] pt-20 backdrop-blur-sm"
          data-testid="mobile-knowledge-detail"
          onClick={handleCloseDetail}
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
                  <span className="max-w-[150px] truncate rounded-full bg-sage/[0.92] px-2 py-1 text-[10px] font-black text-moss">
                    {knowledgeCategoryLabel(selectedItem.category)}
                  </span>
                </div>
                <h3 className="mt-2 break-words text-lg font-black leading-6 text-ink">{knowledgeItemTitle(selectedItem)}</h3>
              </div>
              <button
                aria-label="关闭知识详情"
                className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/[0.84] bg-white/[0.76] text-ink active:scale-[0.98]"
                onClick={handleCloseDetail}
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
                className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full bg-moss text-sm font-black text-white shadow-[0_14px_28px_rgba(47,154,85,0.22)] active:scale-[0.99]"
                onClick={() => void copyKnowledgeItem(selectedItem)}
                type="button"
              >
                <Clipboard className="h-4 w-4" />
                复制
              </button>
              <button
                className="flex h-11 touch-manipulation items-center justify-center rounded-full border border-white/[0.84] bg-white/[0.76] text-sm font-black text-ink active:scale-[0.99]"
                onClick={handleCloseDetail}
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
});
