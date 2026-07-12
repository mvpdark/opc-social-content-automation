"use client";

import { memo } from "react";
import { MobilePanel } from "@/components/mobile-ui";
import {
  MobileReferenceTemplateList,
  ReferencePreviewSheet,
  type SampleReference
} from "@/components/mobile-reference-templates";
import {
  TrendSourceReviewSheet,
  type MobileTrendContent
} from "@/components/mobile-trend-source-review";
import {
  CollectSourceButton,
  COLLECT_SOURCE_ITEMS
} from "@/components/mobile-collect-source-button";

interface CollectSourceAndReferencesProps {
  selectedReference: string;
  onPreviewReference: (item: SampleReference) => void;
  referencePreview: SampleReference | null;
  onCloseReferencePreview: () => void;
  selectedTrendItem: MobileTrendContent | null;
  onCloseTrendReview: () => void;
  onConfirmTrendReview: () => void;
  onOpenTrendReviewUrl: () => void;
  reviewedTrendIdSet: Set<number>;
  selectedTrendIdSet: Set<number>;
  onSelectCollectSource: (label: string) => void;
}

export const CollectSourceAndReferences = memo(function CollectSourceAndReferences({
  selectedReference,
  onPreviewReference,
  referencePreview,
  onCloseReferencePreview,
  selectedTrendItem,
  onCloseTrendReview,
  onConfirmTrendReview,
  onOpenTrendReviewUrl,
  reviewedTrendIdSet,
  selectedTrendIdSet,
  onSelectCollectSource
}: CollectSourceAndReferencesProps) {
  return (
    <>
      <MobilePanel title="采集来源">
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="采集来源选择">
          {COLLECT_SOURCE_ITEMS.map((item, index) => (
            <CollectSourceButton
              icon={item.icon}
              key={`collect-source-${index}-${item.label}`}
              label={item.label}
              onSelect={onSelectCollectSource}
            />
          ))}
        </div>
      </MobilePanel>

      <MobileReferenceTemplateList
        selectedTitle={selectedReference}
        onPreview={onPreviewReference}
      />
      {referencePreview ? (
        <ReferencePreviewSheet
          reference={referencePreview}
          onClose={onCloseReferencePreview}
        />
      ) : null}
      {selectedTrendItem ? (
        <TrendSourceReviewSheet
          item={selectedTrendItem}
          onClose={onCloseTrendReview}
          onConfirm={onConfirmTrendReview}
          onOpenUrl={onOpenTrendReviewUrl}
          reviewed={reviewedTrendIdSet.has(selectedTrendItem.id)}
          selected={selectedTrendIdSet.has(selectedTrendItem.id)}
        />
      ) : null}
    </>
  );
});
