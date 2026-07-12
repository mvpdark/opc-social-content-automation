"use client";

import { memo } from "react";
import { GenerationSourceEvidenceCard } from "@/components/generation-source-evidence-card";
import {
  type GeneratedContent,
  type GeneratedImageAsset,
  type GenerationSourceContext
} from "@/lib/generated-assets";
import { type ProviderStatusItem } from "@/lib/provider-settings";
import { GeneratedPostExportCard } from "./workspace-generation-export-card";
import { PreviewPlaceholder } from "./workspace-generation-form";

interface LauncherPreviewColumnProps {
  evidenceDisabled: boolean;
  sourcePreviewError: string | null;
  knowledgeQuery: string;
  onPreview: () => void;
  sourcePreviewBusy: boolean;
  visibleSourceContext: GenerationSourceContext | null;
  currentExportContent: GeneratedContent | null;
  latestImageAsset: GeneratedImageAsset | null;
  generationBusy: boolean;
  imageProviderReady: boolean;
  onImageGenerated: (asset: GeneratedImageAsset) => void;
  onOpenSettings: () => void;
  onRefreshProviderStatuses: () => Promise<ProviderStatusItem[] | null>;
  workspaceToken: string;
  coverDirectionPreview: string;
  previewTags: string[];
  topic: string;
}

export const LauncherPreviewColumn = memo(function LauncherPreviewColumn({
  evidenceDisabled,
  sourcePreviewError,
  knowledgeQuery,
  onPreview,
  sourcePreviewBusy,
  visibleSourceContext,
  currentExportContent,
  latestImageAsset,
  generationBusy,
  imageProviderReady,
  onImageGenerated,
  onOpenSettings,
  onRefreshProviderStatuses,
  workspaceToken,
  coverDirectionPreview,
  previewTags,
  topic
}: LauncherPreviewColumnProps) {
  return (
    <div className="space-y-4">
      <GenerationSourceEvidenceCard
        disabled={evidenceDisabled}
        error={sourcePreviewError}
        fallbackKnowledgeQuery={knowledgeQuery}
        onPreview={onPreview}
        previewBusy={sourcePreviewBusy}
        sourceContext={visibleSourceContext}
      />
      {currentExportContent ? (
        <GeneratedPostExportCard
          key={currentExportContent.id}
          content={currentExportContent}
          generatedImageAsset={latestImageAsset}
          generationBusy={generationBusy}
          imageProviderReady={imageProviderReady}
          onImageGenerated={onImageGenerated}
          onOpenSettings={onOpenSettings}
          onRefreshProviderStatuses={onRefreshProviderStatuses}
          workspaceToken={workspaceToken}
        />
      ) : (
        <PreviewPlaceholder
          coverDirectionPreview={coverDirectionPreview}
          previewTags={previewTags}
          topic={topic}
        />
      )}
    </div>
  );
});
