export function normalizeTags(tags: string[] | null | undefined) {
  return (tags ?? []).map((tag) => tag.trim().replace(/^#+/, "")).filter(Boolean);
}

export function formatTags(tags: string[] | null | undefined) {
  return normalizeTags(tags).map((tag) => `#${tag}`);
}

export function formatTagLine(tags: string[] | null | undefined) {
  return formatTags(tags).join(" ");
}
