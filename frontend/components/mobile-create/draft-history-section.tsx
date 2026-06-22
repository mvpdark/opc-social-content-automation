"use client";

import { DraftHistoryCarousel, DraftHistorySelectionBar } from "@/components/mobile-draft-history";
import { DraftPreviewEditor } from "@/components/mobile-draft-preview-editor";
import type { DraftPreviewState, MobileDraftHistoryItem } from "@/lib/mobile-draft-storage";
import type { GeneratedContent } from "@/lib/generated-assets";

interface DraftHistorySectionProps {
  activeContentId: number | null;
  error: string | null;
  items: MobileDraftHistoryItem[];
  onLongPress: (item: MobileDraftHistoryItem) => void;
  onOpen: (item: MobileDraftHistoryItem) => void;
  onRetry: () => void;
  onToggleSelection: (item: MobileDraftHistoryItem) => void;
  selectedDraftIds: number[];
  selectionMode: boolean;
  onCancelSelection: () => void;
  onDeleteSelected: () => void;
  onPinToggle: () => void;
  selectedCount: number;
  selectedItem: MobileDraftHistoryItem | null;
  previewOpen: boolean;
  coverImageUrl: string | null;
  draft: DraftPreviewState;
  generatedContent: GeneratedContent | null;
  onDraftChange: (draft: DraftPreviewState) => void;
  onPreviewClose: () => void;
  onCopy: () => Promise<boolean>;
  onExportStatus: (message: string) => void;
}

export function DraftHistorySection(props: DraftHistorySectionProps) {
  const {
    activeContentId,
    error,
    items,
    onLongPress,
    onOpen,
    onRetry,
    onToggleSelection,
    selectedDraftIds,
    selectionMode,
    onCancelSelection,
    onDeleteSelected,
    onPinToggle,
    selectedCount,
    selectedItem,
    previewOpen,
    coverImageUrl,
    draft,
    generatedContent,
    onDraftChange,
    onPreviewClose,
    onCopy,
    onExportStatus
  } = props;

  return (
    <>
      <DraftHistoryCarousel
        activeContentId={activeContentId}
        error={error}
        items={items}
        onLongPress={onLongPress}
        onOpen={onOpen}
        onRetry={onRetry}
        onToggleSelection={onToggleSelection}
        selectedDraftIds={selectedDraftIds}
        selectionMode={selectionMode}
      />

      {selectionMode ? (
        <DraftHistorySelectionBar
          onCancel={onCancelSelection}
          onDelete={onDeleteSelected}
          onPinToggle={onPinToggle}
          selectedCount={selectedCount}
          selectedItem={selectedItem}
        />
      ) : null}

      {previewOpen ? (
        <DraftPreviewEditor
          coverImageUrl={coverImageUrl}
          draft={draft}
          generatedContent={generatedContent}
          onChange={onDraftChange}
          onClose={onPreviewClose}
          onCopy={onCopy}
          onExportStatus={onExportStatus}
        />
      ) : null}
    </>
  );
}
