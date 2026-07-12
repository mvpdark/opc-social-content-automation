import { parseTagText } from "@/lib/tags";

export type GenerationInputSignature = {
  knowledgeQuery: string;
  platform: string;
  tags: string[];
  targetAudience: string;
  tone: string;
  topic: string;
};

export type GeneratedContentInputSignature = {
  contentId: number;
  signature: GenerationInputSignature;
};

type GenerationInputSignatureOptions = {
  knowledgeQuery?: string | null;
  platform: string;
  tagsText: string;
  targetAudience?: string | null;
  tone?: string | null;
  topic: string;
};

function normalizeSignatureText(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function buildGenerationInputSignature({
  knowledgeQuery,
  platform,
  tagsText,
  targetAudience,
  tone,
  topic
}: GenerationInputSignatureOptions): GenerationInputSignature {
  return {
    knowledgeQuery: normalizeSignatureText(knowledgeQuery),
    platform: normalizeSignatureText(platform),
    tags: parseTagText(tagsText),
    targetAudience: normalizeSignatureText(targetAudience),
    tone: normalizeSignatureText(tone),
    topic: normalizeSignatureText(topic)
  };
}

function generationInputSignaturesMatch(
  left: GenerationInputSignature,
  right: GenerationInputSignature
) {
  return (
    left.knowledgeQuery === right.knowledgeQuery &&
    left.platform === right.platform &&
    left.targetAudience === right.targetAudience &&
    left.tone === right.tone &&
    left.topic === right.topic &&
    left.tags.length === right.tags.length &&
    left.tags.every((tag, index) => tag === right.tags[index])
  );
}

export function generatedContentInputSignatureMatches(
  contentId: number,
  record: GeneratedContentInputSignature | null,
  currentSignature: GenerationInputSignature
) {
  // Restored drafts may not have an in-memory signature; only enforce signatures for the same content id.
  return (
    !record ||
    record.contentId !== contentId ||
    generationInputSignaturesMatch(record.signature, currentSignature)
  );
}
