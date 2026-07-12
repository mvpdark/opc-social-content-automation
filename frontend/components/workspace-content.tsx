"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  contentControls,
  writingReferences,
  type InterfaceStyle
} from "@/lib/dashboard-data";
import {
  isGeneratedContent,
  isGeneratedImageAsset,
  type GeneratedContent,
  type GeneratedImageAsset
} from "@/lib/generated-assets";
import {
  API_BASE,
  findEnabledCreationProject,
  isPcReviewQueueCandidate,
  isTestDraft,
  LAST_GENERATED_CONTENT_STORAGE_KEY,
  loadPinnedDraftIds,
  loadStoredGeneratedContent,
  readApiError,
  removeLocalStorage,
  savePinnedDraftIds,
  saveStoredGeneratedContent,
  secondaryButtonClass,
  sortDraftHistory,
  subtleCardClass,
  updateCreationProjectQuery,
  upsertDraftHistory,
  type CreationProjectId,
  type WritingStylePresetId
} from "./workspace-utils";
import {
  IconBox,
  Panel,
  Pill
} from "./workspace-ui";
import { ReferencePanel } from "./workspace-delivery";
import { GenerationLauncher } from "./workspace-generation";
import { CreationProjectGateway } from "./workspace-creation-gateway";
import { DraftPanel } from "./workspace-draft-panel";
import { PcReviewQueuePanel } from "./workspace-review-queue";

export const ContentView = memo(function ContentView({
  defaultWritingStyle,
  interfaceStyle,
  initialProject,
  onOpenSettings,
  workspaceToken
}: {
  defaultWritingStyle: WritingStylePresetId;
  interfaceStyle: InterfaceStyle;
  initialProject: string | null;
  onOpenSettings: () => void;
  workspaceToken: string;
}) {
  const [selectedCreationProjectId, setSelectedCreationProjectId] =
    useState<CreationProjectId | null>(
      () => findEnabledCreationProject(initialProject)?.id ?? null
    );
  const [previewContent, setPreviewContent] = useState<GeneratedContent | null>(null);
  const [previewImageAsset, setPreviewImageAsset] = useState<GeneratedImageAsset | null>(null);
  const [draftHistory, setDraftHistory] = useState<GeneratedContent[]>([]);
  const [reviewQueueContents, setReviewQueueContents] = useState<GeneratedContent[]>([]);
  const [draftImagesByContentId, setDraftImagesByContentId] = useState<
    Record<number, GeneratedImageAsset | null>
  >({});
  const [pinnedDraftIds, setPinnedDraftIds] = useState<number[]>([]);
  const [draftActionError, setDraftActionError] = useState<string | null>(null);
  const [draftHistoryError, setDraftHistoryError] = useState<string | null>(null);
  const [draftHistoryReloadKey, setDraftHistoryReloadKey] = useState(0);
  const [reviewQueueError, setReviewQueueError] = useState<string | null>(null);
  const [reviewQueueLoading, setReviewQueueLoading] = useState(true);
  const [reviewQueueReloadKey, setReviewQueueReloadKey] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(true);
  const selectedCreationProject = useMemo(
    () => findEnabledCreationProject(selectedCreationProjectId),
    [selectedCreationProjectId]
  );

  const draftHistoryRef = useRef(draftHistory);
  draftHistoryRef.current = draftHistory;
  const reviewQueueContentsRef = useRef(reviewQueueContents);
  reviewQueueContentsRef.current = reviewQueueContents;
  const pinnedDraftIdsRef = useRef(pinnedDraftIds);
  pinnedDraftIdsRef.current = pinnedDraftIds;
  const previewContentRef = useRef(previewContent);
  previewContentRef.current = previewContent;
  const draftImagesByContentIdRef = useRef(draftImagesByContentId);
  draftImagesByContentIdRef.current = draftImagesByContentId;
  const activeRef = useRef(true);
  const contentRequestIdRef = useRef(0);
  const reviewQueueRequestIdRef = useRef(0);
  const draftImageAbortRef = useRef<AbortController | null>(null);
  const deleteDraftAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      draftImageAbortRef.current?.abort();
      deleteDraftAbortRef.current?.abort();
    };
  }, []);

  const pcReviewQueueContents = useMemo(
    () => reviewQueueContents.filter(isPcReviewQueueCandidate),
    [reviewQueueContents]
  );

  const fetchLatestImage = useCallback(async (contentId: number, signal?: AbortSignal) => {
    try {
      const headers = workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : undefined;
      const response = await fetch(`${API_BASE}/image/list?content_id=${contentId}&limit=1`, {
        headers,
        signal
      });
      if (!response.ok) {
        return null;
      }
      const images = await response.json();
      if (!activeRef.current) return null;
      if (!Array.isArray(images)) {
        return null;
      }
      return images.find(isGeneratedImageAsset) ?? null;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      return null;
    }
  }, [workspaceToken]);

  const handleGeneratedContent = useCallback((content: GeneratedContent) => {
    setPreviewContent(content);
    setPreviewImageAsset(null);
    setDraftHistory((current) =>
      sortDraftHistory(upsertDraftHistory(current, content), pinnedDraftIdsRef.current)
    );
    setReviewQueueContents((current) =>
      isPcReviewQueueCandidate(content)
        ? sortDraftHistory(upsertDraftHistory(current, content), pinnedDraftIdsRef.current)
        : current.filter((item) => item.id !== content.id)
    );
    setDraftActionError(null);
    setDraftHistoryError(null);
    setReviewQueueError(null);
    saveStoredGeneratedContent(content);
  }, []);

  const handleImageGenerated = useCallback((asset: GeneratedImageAsset) => {
    setPreviewImageAsset(asset);
    setDraftImagesByContentId((current) => ({
      ...current,
      [asset.content_id]: asset
    }));
  }, []);

  const handleSelectDraft = useCallback(async (content: GeneratedContent) => {
    setPreviewContent(content);
    setDraftActionError(null);
    saveStoredGeneratedContent(content);
    if (Object.prototype.hasOwnProperty.call(draftImagesByContentIdRef.current, content.id)) {
      setPreviewImageAsset(draftImagesByContentIdRef.current[content.id]);
      return;
    }
    setPreviewImageAsset(null);
    draftImageAbortRef.current?.abort();
    const draftImageController = new AbortController();
    draftImageAbortRef.current = draftImageController;
    let image: GeneratedImageAsset | null = null;
    try {
      image = await fetchLatestImage(content.id, draftImageController.signal);
    } catch {
      // AbortError from fetchLatestImage when user selects another draft
      // or component unmounts. Safe to return silently.
      return;
    }
    if (!activeRef.current || draftImageController.signal.aborted) return;
    setDraftImagesByContentId((current) => ({
      ...current,
      [content.id]: image
    }));
    if (previewContentRef.current?.id === content.id) {
      setPreviewImageAsset(image);
    }
  }, [fetchLatestImage]);

  const handleTogglePinDraft = useCallback((contentId: number) => {
    const current = pinnedDraftIdsRef.current;
    const next = current.includes(contentId)
      ? current.filter((id) => id !== contentId)
      : [contentId, ...current];
    setPinnedDraftIds(next);
    savePinnedDraftIds(next);
    setDraftHistory((history) => sortDraftHistory(history, next));
  }, []);

  const handleDeleteDraft = useCallback(async (contentId: number) => {
    setDraftActionError(null);
    deleteDraftAbortRef.current?.abort();
    const deleteController = new AbortController();
    deleteDraftAbortRef.current = deleteController;
    try {
      const headers = workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : undefined;
      const response = await fetch(`${API_BASE}/content/${contentId}`, {
        headers,
        method: "DELETE",
        signal: deleteController.signal
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "草稿删除失败。"));
      }
      if (!activeRef.current) return;
      const nextHistory = draftHistoryRef.current.filter((content) => content.id !== contentId);
      const nextReviewQueue = reviewQueueContentsRef.current.filter((content) => content.id !== contentId);
      const nextPinnedIds = pinnedDraftIdsRef.current.filter((id) => id !== contentId);
      const nextContent = previewContentRef.current?.id === contentId ? nextHistory[0] ?? null : previewContentRef.current;
      setDraftHistory((current) => sortDraftHistory(current.filter((content) => content.id !== contentId), nextPinnedIds));
      setReviewQueueContents((current) => sortDraftHistory(current.filter((content) => content.id !== contentId), nextPinnedIds));
      setPinnedDraftIds(nextPinnedIds);
      savePinnedDraftIds(nextPinnedIds);
      setDraftImagesByContentId((current) => {
        const next = { ...current };
        delete next[contentId];
        return next;
      });
      if (previewContentRef.current?.id === contentId) {
        setPreviewContent(nextContent);
        setPreviewImageAsset(nextContent ? draftImagesByContentIdRef.current[nextContent.id] ?? null : null);
        if (nextContent) {
          saveStoredGeneratedContent(nextContent);
        } else {
          removeLocalStorage(LAST_GENERATED_CONTENT_STORAGE_KEY);
        }
      }
    } catch (error) {
      if (!activeRef.current) return;
      if (error instanceof Error && error.name === "AbortError") return;
      setDraftActionError(error instanceof Error ? error.message : "草稿删除失败。");
    }
  }, [workspaceToken]);

  const handleSelectCreationProject = useCallback((projectId: CreationProjectId) => {
    setSelectedCreationProjectId(projectId);
    updateCreationProjectQuery(projectId);
  }, []);

  const handleReturnToProjects = useCallback(() => {
    setSelectedCreationProjectId(null);
    updateCreationProjectQuery(null);
  }, []);

  const handleRetryContentList = useCallback(() => {
    setReviewQueueLoading(true);
    setReviewQueueError(null);
    setReviewQueueReloadKey((current) => current + 1);
  }, []);

  const handleRetryDraftHistory = useCallback(() => {
    setPreviewLoading(true);
    setDraftHistoryError(null);
    setDraftHistoryReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const project = findEnabledCreationProject(params.get("project"));
    if (project) {
      setSelectedCreationProjectId(project.id);
    } else if (params.has("project")) {
      updateCreationProjectQuery(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const abortController = new AbortController();
    const { signal } = abortController;
    const storedPinnedIds = loadPinnedDraftIds();
    setPinnedDraftIds(storedPinnedIds);
    const storedContent = loadStoredGeneratedContent();
    if (storedContent) {
      setPreviewContent(storedContent);
      setDraftHistory([storedContent]);
    }

    if (storedContent) {
      void fetchLatestImage(storedContent.id, signal).then((image) => {
        if (active) {
          setPreviewImageAsset(image);
          setDraftImagesByContentId((current) => ({
            ...current,
            [storedContent.id]: image
          }));
        }
      }).catch((err: unknown) => { if (err instanceof Error && err.name === "AbortError") return null; if (process.env.NODE_ENV === "development") console.debug("fetchLatestImage error:", err); return null; });
    }

    async function loadLatestContent() {
      const requestId = ++contentRequestIdRef.current;
      try {
        const headers = workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : undefined;
        const response = await fetch(`${API_BASE}/content/list?platform=xiaohongshu`, {
          headers,
          signal
        });
        if (!response.ok) {
          throw new Error(await readApiError(response, "历史草稿读取失败。"));
        }
        const contents = (await response.json()) as unknown;
        if (!Array.isArray(contents)) {
          throw new Error("历史草稿格式异常，请稍后重试。");
        }
        const history = sortDraftHistory(
          contents.filter(isGeneratedContent).filter((content) => !isTestDraft(content)),
          storedPinnedIds
        );
        const latestContent = history[0] ?? null;
        if (active) {
          // MERGE: preserve drafts generated during fetch; append API history without duplicates
          setDraftHistory((current) => {
            const existingIds = new Set(current.map((d) => d.id));
            const newItems = history.filter((h) => !existingIds.has(h.id));
            return sortDraftHistory([...current, ...newItems], storedPinnedIds);
          });
          // Guard: only adopt API latest content/image when user hasn't selected/generated one
          if (!previewContentRef.current) {
            setPreviewImageAsset(null);
            if (latestContent) {
              saveStoredGeneratedContent(latestContent);
            }
            setPreviewContent(latestContent);
          }
          setDraftHistoryError(null);
        }
        async function loadImagesBatched() {
          const IMAGE_BATCH_SIZE = 5;
          for (let i = 0; i < history.length; i += IMAGE_BATCH_SIZE) {
            if (!active || contentRequestIdRef.current !== requestId) return;
            const batch = history.slice(i, i + IMAGE_BATCH_SIZE);
            await Promise.all(batch.map((content) =>
              fetchLatestImage(content.id, signal).then((image) => {
                if (!active || contentRequestIdRef.current !== requestId) {
                  return;
                }
                setDraftImagesByContentId((current) => ({
                  ...current,
                  [content.id]: image
                }));
                if (latestContent?.id === content.id && !previewContentRef.current) {
                  setPreviewImageAsset(image);
                }
              }).catch((err: unknown) => { if (err instanceof Error && err.name === "AbortError") return null; if (process.env.NODE_ENV === "development") console.debug("fetchLatestImage error:", err); return null; })
            ));
          }
        }
        void loadImagesBatched();
      } catch (error) {
        if (active) {
          setDraftHistoryError(error instanceof Error ? error.message : "历史草稿读取失败。");
        }
        // Keep the local draft or full example visible when the database/API is not available.
      } finally {
        if (active) {
          setPreviewLoading(false);
        }
      }
    }

    void loadLatestContent();
    return () => {
      active = false;
      abortController.abort();
    };
  }, [draftHistoryReloadKey, workspaceToken, fetchLatestImage]);

  useEffect(() => {
    let active = true;
    const abortController = new AbortController();
    const { signal } = abortController;

    async function loadReviewQueue() {
      const requestId = ++reviewQueueRequestIdRef.current;
      try {
        if (active) {
          setReviewQueueLoading(true);
          setReviewQueueError(null);
        }
        const headers = workspaceToken ? { Authorization: `Bearer ${workspaceToken}` } : undefined;
        const response = await fetch(`${API_BASE}/content/review-queue?platform=xiaohongshu`, {
          headers,
          signal
        });
        if (!response.ok) {
          throw new Error(await readApiError(response, "待人工确认队列读取失败。"));
        }
        const contents = (await response.json()) as unknown;
        if (!Array.isArray(contents)) {
          throw new Error("待人工确认队列格式异常，请稍后重试。");
        }
        if (requestId !== reviewQueueRequestIdRef.current) return;
        const queue = sortDraftHistory(
          contents
            .filter(isGeneratedContent)
            .filter((content) => !isTestDraft(content))
            .filter(isPcReviewQueueCandidate),
          pinnedDraftIdsRef.current
        );
        if (active) {
          setReviewQueueContents(queue);
        }
      } catch (error) {
        if (active && requestId === reviewQueueRequestIdRef.current) {
          setReviewQueueError(error instanceof Error ? error.message : "待人工确认队列读取失败。");
        }
      } finally {
        if (active && requestId === reviewQueueRequestIdRef.current) {
          setReviewQueueLoading(false);
        }
      }
    }

    void loadReviewQueue();
    return () => {
      active = false;
      abortController.abort();
    };
  }, [reviewQueueReloadKey, workspaceToken]);

  if (!selectedCreationProject) {
    return (
      <CreationProjectGateway
        latestContent={previewContent}
        loading={previewLoading}
        onSelect={handleSelectCreationProject}
      />
    );
  }

  return (
    <div className="workspace-content-layout space-y-4">
      <section className="workspace-content-status glass-panel rounded-md border px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Pill tone="green">当前项目</Pill>
              <Pill tone="blue">小红书获客</Pill>
              <Pill tone="amber">人工确认后发布</Pill>
            </div>
            <h2 className="mt-3 text-xl font-semibold leading-7 text-ink">
              {selectedCreationProject.title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
              {selectedCreationProject.description}
            </p>
          </div>
          <button
            className={`${secondaryButtonClass} h-10 px-4`}
            data-testid="creation-project-return"
            onClick={handleReturnToProjects}
            type="button"
          >
            返回项目
          </button>
        </div>
      </section>

        <GenerationLauncher
          defaultWritingStyle={defaultWritingStyle}
          latestImageAsset={previewImageAsset}
          latestContent={previewContent}
          onGeneratedContent={handleGeneratedContent}
          onImageGenerated={handleImageGenerated}
          onOpenSettings={onOpenSettings}
          workspaceToken={workspaceToken}
        />

      <div className="workspace-content-grid grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <DraftPanel
          content={previewContent}
          coverImageAsset={previewImageAsset}
          draftActionError={draftActionError}
          draftHistoryError={draftHistoryError}
          history={draftHistory}
          imageAssetsByContentId={draftImagesByContentId}
          interfaceStyle={interfaceStyle}
          loading={previewLoading}
          onDeleteContent={handleDeleteDraft}
          onRetryDraftHistory={handleRetryDraftHistory}
          onSelectContent={handleSelectDraft}
          onTogglePin={handleTogglePinDraft}
          pinnedContentIds={pinnedDraftIds}
        />
        <div className="space-y-4">
          <PcReviewQueuePanel
            contents={pcReviewQueueContents}
            error={reviewQueueError}
            loading={reviewQueueLoading}
            onRetry={handleRetryContentList}
            onSelectContent={handleSelectDraft}
          />
          <Panel helper="生成前需要明确输入、改写和确认边界。" title="生产控制">
            <div className="space-y-3">
              {contentControls.map((control, index) => (
                <div key={`content-control-${index}-${control.title}`} className={`${subtleCardClass} p-3`}>
                  <div className="flex items-center gap-3">
                    <IconBox tone="blue">
                      <control.icon className="h-4 w-4" />
                    </IconBox>
                    <div>
                      <div className="text-sm font-semibold">{control.title}</div>
                      <p className="mt-1 text-xs leading-5 text-muted">{control.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <ReferencePanel
            helper="用于降低模板感、提高开头吸引力。"
            items={writingReferences}
            title="可用参考"
          />
        </div>
      </div>
    </div>
  );
});
