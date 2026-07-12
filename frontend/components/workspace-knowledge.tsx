"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Clipboard, ExternalLink, GraduationCap, Loader2, RotateCcw, Search, X } from "lucide-react";
import { knowledgeAssets } from "@/lib/dashboard-data";
import { copyText } from "@/lib/clipboard";
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
import {
  secondaryButtonClass,
  subtleCardClass
} from "./workspace-utils";
import { IconBox, Panel, Pill } from "./workspace-ui";
import { SafetyGateList } from "./workspace-delivery";

export const KnowledgeView = memo(function KnowledgeView() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("正在读取知识库...");
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [portalReady, setPortalReady] = useState(false);
  const [notices, setNotices] = useState<AdmissionNotice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const activeRef = useRef(true);
  const requestIdRef = useRef(0);
  const noticesRequestIdRef = useRef(0);
  const searchAbortRef = useRef<AbortController | null>(null);

  const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const loadKnowledge = useCallback(async function loadKnowledge(nextQuery: string = "", signal?: AbortSignal) {
    const requestId = ++requestIdRef.current;
    const normalizedQuery = nextQuery.trim();
    setLoading(true);
    setMessage(normalizedQuery ? "正在搜索知识库..." : "正在读取最近入库内容...");
    try {
      const data = await fetchKnowledgeItems(getZscjApiBase(), {
        limit: 24,
        query: normalizedQuery,
        signal
      });
      if (!activeRef.current || requestIdRef.current !== requestId) return;
      setItems(data);
      setMessage(
        data.length
          ? normalizedQuery
            ? `找到 ${data.length} 条相关知识。`
            : `已显示最近 ${data.length} 条知识。`
          : normalizedQuery
            ? "没有找到匹配知识，可以换个关键词。"
            : "知识库还没有条目，先从采集页保存知识摘要。"
      );
    } catch (error) {
      if (!activeRef.current || requestIdRef.current !== requestId) return;
      if (error instanceof Error && error.name === "AbortError") return;
      setItems([]);
      setMessage(error instanceof Error ? error.message : "知识库读取失败，请稍后再试。");
    } finally {
      if (activeRef.current && requestIdRef.current === requestId) setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    activeRef.current = true;
    const controller = new AbortController();
    void loadKnowledge("", controller.signal);
    void loadNotices(controller.signal);
    return () => {
      activeRef.current = false;
      searchAbortRef.current?.abort();
      controller.abort();
    };
  }, [loadKnowledge, loadNotices]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setCopyState("idle");
  }, [selectedItem?.id]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    void loadKnowledge(query, controller.signal);
  }

  const openKnowledgeItem = useCallback((item: KnowledgeItem) => {
    setSelectedItem(item);
  }, []);

  const openKnowledgeDetailModal = useCallback((item: KnowledgeItem) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  }, []);

  const copyKnowledgeItem = useCallback(async (item: KnowledgeItem) => {
    try {
      await copyText(`${knowledgeItemTitle(item)}\n\n${knowledgeItemContent(item)}`);
      if (!activeRef.current) return;
      setCopyState("copied");
    } catch (_error) {
      if (!activeRef.current) return;
      setCopyState("failed");
    }
  }, []);

  const visibleDetailItem = useMemo(() => selectedItem ?? items[0] ?? null, [selectedItem, items]);
  const detailPanelAction = useMemo(
    () => (visibleDetailItem ? <Pill tone="green">可复制</Pill> : <Pill tone="neutral">待选择</Pill>),
    [visibleDetailItem?.id]
  );

  return (
    <div className="workspace-knowledge-layout grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Panel helper="查看已经入库的采集摘要、写作素材和人工确认后的知识条目。" title="知识库">
        <form className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]" onSubmit={submitSearch}>
          <label className="min-w-0">
            <span className="text-xs font-medium text-muted">搜索知识条目</span>
            <div className="glass-control mt-2 flex h-10 items-center gap-2 rounded-md border px-3">
              <Search className="h-4 w-4 text-muted" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                data-testid="knowledge-search-input"
                onChange={handleQueryChange}
                placeholder="例如：水博 排名 学校 认证"
                value={query}
              />
            </div>
          </label>
          <button
            className="mt-auto flex h-10 items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            搜索
          </button>
          <button
            className={`${secondaryButtonClass} mt-auto h-10 px-4 disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={loading}
            onClick={() => {
              setQuery("");
              searchAbortRef.current?.abort();
              const controller = new AbortController();
              searchAbortRef.current = controller;
              void loadKnowledge("", controller.signal);
            }}
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
            刷新
          </button>
        </form>

        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted" data-testid="knowledge-list-status">
            {message}
          </p>
          <Pill tone={items.length ? "green" : "neutral"}>{items.length} 条</Pill>
        </div>

        <div className="overflow-hidden rounded-md border border-line/70" data-testid="knowledge-list">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold text-muted">
                  <th className="px-3 py-3">标题</th>
                  <th className="px-3 py-3">类别</th>
                  <th className="px-3 py-3">来源</th>
                  <th className="px-3 py-3">状态</th>
                  <th className="px-3 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((item) => (
                  <KnowledgeTableRow
                    isSelected={visibleDetailItem?.id === item.id}
                    item={item}
                    key={item.id}
                    onOpen={openKnowledgeItem}
                    onOpenDetail={openKnowledgeDetailModal}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && items.length === 0 ? (
          <div className={`${subtleCardClass} mt-3 px-4 py-5 text-sm leading-6 text-muted`}>
            这里会展示采集页保存的知识摘要。先在“采集”里确认来源，再保存知识摘要，之后创作会优先引用这里的内容。
          </div>
        ) : null}
      </Panel>

      {detailModalOpen && selectedItem && portalReady
        ? createPortal(
            <div
              aria-modal="true"
              className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-md"
              data-testid="pc-knowledge-detail-modal"
              onClick={() => setDetailModalOpen(false)}
              role="dialog"
            >
              <section
                aria-label="知识条目详情"
                className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-white/50 bg-paper shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-moss">#{selectedItem.id}</span>
                      <Pill>{knowledgeCategoryLabel(selectedItem.category)}</Pill>
                    </div>
                    <h3 className="mt-2 break-words text-lg font-semibold leading-7 text-ink">
                      {knowledgeItemTitle(selectedItem)}
                    </h3>
                  </div>
                  <button
                    aria-label="关闭知识条目详情"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-mist text-muted"
                    data-testid="pc-knowledge-detail-close"
                    onClick={() => setDetailModalOpen(false)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  <p
                    className="whitespace-pre-wrap break-words text-sm leading-7 text-ink/82"
                    data-testid="pc-knowledge-detail-content"
                  >
                    {knowledgeItemContent(selectedItem)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-muted">
                    这是已入库知识内容；涉及学校、价格、排名或认证时，发布前仍需回到来源核对。
                  </p>
                  <button
                    className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-paper"
                    data-testid="pc-knowledge-detail-copy"
                    onClick={() => void copyKnowledgeItem(selectedItem)}
                    type="button"
                  >
                    <Clipboard className="h-4 w-4" />
                    {copyState === "copied" ? "已复制" : copyState === "failed" ? "复制失败，请手选" : "复制知识条目"}
                  </button>
                </div>
              </section>
            </div>,
            document.body
          )
        : null}

      <div className="space-y-4">
        <Panel
          action={detailPanelAction}
          helper="点击左侧知识条目后，会在这里直接展开正文。"
          title="知识详情"
        >
          {visibleDetailItem ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-moss">#{visibleDetailItem.id}</span>
                <Pill>{knowledgeCategoryLabel(visibleDetailItem.category)}</Pill>
                {visibleDetailItem.match_type ? (
                  <Pill tone={visibleDetailItem.match_type === "recent" ? "neutral" : "green"}>
                    {visibleDetailItem.match_type === "recent" ? "最近入库" : "检索命中"}
                  </Pill>
                ) : null}
              </div>
              <h3 className="mt-3 break-words text-lg font-semibold leading-7 text-ink">
                {knowledgeItemTitle(visibleDetailItem)}
              </h3>
              <div className="mt-4 max-h-[420px] overflow-y-auto rounded-md border border-line/70 bg-paper/60 p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-ink/82">
                  {knowledgeItemContent(visibleDetailItem)}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  className="flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-paper"
                  onClick={() => void copyKnowledgeItem(visibleDetailItem)}
                  type="button"
                >
                  <Clipboard className="h-4 w-4" />
                  {copyState === "copied" ? "已复制" : copyState === "failed" ? "复制失败" : "复制条目"}
                </button>
                <button
                  className={`${secondaryButtonClass} h-10 px-4`}
                  onClick={() => openKnowledgeDetailModal(visibleDetailItem)}
                  type="button"
                >
                  <ExternalLink className="h-4 w-4" />
                  展开详情
                </button>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">
                学校、价格、排名、认证等事实仍需回到原始来源核对后再发布。
              </p>
            </div>
          ) : (
            <div className={`${subtleCardClass} px-4 py-5 text-sm leading-6 text-muted`}>
              当前没有可预览的知识条目。先从采集页保存知识摘要。
            </div>
          )}
        </Panel>
        <Panel helper="系统默认不跳过的项目规则。" title="入库规则">
          <SafetyGateList />
        </Panel>
        <Panel
          action={noticesLoading ? undefined : `${notices.length} 条`}
          helper="各高校研究生招生公告，点击可查看原文。"
          title="大学通告"
        >
          {noticesLoading ? (
            <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在加载大学通告...
            </div>
          ) : notices.length === 0 ? (
            <div className={`${subtleCardClass} px-4 py-5 text-sm leading-6 text-muted`}>
              暂无大学通告数据。
            </div>
          ) : (
            <div className="max-h-[480px] space-y-2 overflow-y-auto">
              {notices.map((notice) => (
                <a
                  key={notice.id}
                  href={notice.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${subtleCardClass} block p-3 transition hover:bg-moss/5`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss">
                      <GraduationCap className="h-3.5 w-3.5" />
                    </span>
                    <Pill tone="green">{notice.school_name || "高校"}</Pill>
                    {notice.publish_date ? (
                      <span className="ml-auto text-xs text-muted">
                        {formatNoticeDate(notice.publish_date)}
                      </span>
                    ) : null}
                  </div>
                  <h4 className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-5">
                    {notice.title}
                  </h4>
                  {notice.summary ? (
                    <p className="mt-1 line-clamp-2 break-words text-xs leading-4 text-muted">
                      {notice.summary}
                    </p>
                  ) : null}
                  <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-moss">
                    <ExternalLink className="h-3 w-3" />
                    查看原文
                  </div>
                </a>
              ))}
            </div>
          )}
        </Panel>
        <Panel helper="这些是知识资产的类型说明，不是虚构样本。" title="知识资产类型">
          <div className="grid grid-cols-1 gap-3">
            {knowledgeAssets.map((asset, index) => (
              <div key={`knowledge-asset-${index}-${asset.title}`} className={`${subtleCardClass} p-4`}>
                <div className="flex items-start gap-3">
                  <IconBox tone="green">
                    <asset.icon className="h-4 w-4" />
                  </IconBox>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold">{asset.title}</h3>
                      <Pill>{asset.status}</Pill>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted">{asset.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
});

const KnowledgeTableRow = memo(function KnowledgeTableRow({
  isSelected,
  item,
  onOpen,
  onOpenDetail
}: {
  isSelected: boolean;
  item: KnowledgeItem;
  onOpen: (item: KnowledgeItem) => void;
  onOpenDetail: (item: KnowledgeItem) => void;
}) {
  const title = useMemo(() => knowledgeItemTitle(item), [item]);
  const excerpt = useMemo(() => knowledgeItemExcerpt(item, 150), [item]);
  const categoryLabel = useMemo(() => knowledgeCategoryLabel(item.category), [item.category]);
  const scorePill = useMemo(() => {
    if (typeof item.score !== "number") {
      return <Pill tone="neutral">点击看全文</Pill>;
    }
    return <Pill tone="green">匹配 {Math.round(item.score * 100)}%</Pill>;
  }, [item.score]);

  return (
    <tr
      className={[
        "cursor-pointer bg-paper/50 align-top transition focus-within:bg-moss/10 hover:bg-moss/5",
        isSelected ? "bg-moss/10" : ""
      ].join(" ")}
      data-testid="knowledge-item"
      onClick={() => onOpen(item)}
    >
      <td className="px-3 py-3">
        <button
          className="block w-full text-left focus-visible:outline-none"
          onClick={() => onOpen(item)}
          type="button"
        >
          <span className="line-clamp-2 break-words font-semibold leading-5 text-ink">
            {title}
          </span>
          <span className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted">
            {excerpt}
          </span>
        </button>
      </td>
      <td className="px-3 py-3">
        <Pill>{categoryLabel}</Pill>
      </td>
      <td className="px-3 py-3 text-xs leading-5 text-muted">
        #{item.id}
        <br />
        {item.match_type === "recent" ? "最近入库" : "检索结果"}
      </td>
      <td className="px-3 py-3">
        {scorePill}
      </td>
      <td className="px-3 py-3 text-right">
        <button
          className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-paper/70 px-3 text-xs font-semibold text-ink"
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetail(item);
          }}
          type="button"
        >
          展开
        </button>
      </td>
    </tr>
  );
});
