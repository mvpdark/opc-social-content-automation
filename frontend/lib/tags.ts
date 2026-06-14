export function normalizeTags(tags: string[] | null | undefined) {
  return (tags ?? []).map((tag) => tag.trim().replace(/^#+/, "")).filter(Boolean);
}

export function parseTagText(tagsText: string) {
  return tagsText
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function tagsMatchText(tags: string[] | null | undefined, tagsText: string) {
  const normalizedTags = normalizeTags(tags);
  const normalizedTextTags = normalizeTags(parseTagText(tagsText));
  return (
    normalizedTags.length === normalizedTextTags.length &&
    normalizedTags.every((tag, index) => tag === normalizedTextTags[index])
  );
}

export function formatTags(tags: string[] | null | undefined) {
  return normalizeTags(tags).map((tag) => `#${tag}`);
}

export function formatTagLine(tags: string[] | null | undefined) {
  return formatTags(tags).join(" ");
}
