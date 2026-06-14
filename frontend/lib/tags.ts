const TAG_SPLIT_PATTERN = /[\s,，、;；|/]+/;

export function normalizeTags(tags: string[] | null | undefined) {
  const seenTags = new Set<string>();
  return (tags ?? [])
    .map((tag) => tag.trim().replace(/^[#＃]+/, ""))
    .filter(Boolean)
    .filter((tag) => {
      if (seenTags.has(tag)) {
        return false;
      }
      seenTags.add(tag);
      return true;
    });
}

export function parseTagText(tagsText: string) {
  return normalizeTags(tagsText.replace(/[#＃]/g, " #").split(TAG_SPLIT_PATTERN));
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
