import { formatTagLine, normalizeTags, parseTagText } from "@/lib/tags";

type CopyTags = string[] | string | null | undefined;

type PlatformCopyInput = {
  body: string;
  tags: CopyTags;
  title: string;
};

function normalizeCopyTags(tags: CopyTags) {
  return typeof tags === "string" ? parseTagText(tags) : normalizeTags(tags);
}

function isTagOnlyLine(line: string) {
  const trimmedLine = line.trim();
  return trimmedLine.startsWith("#") || trimmedLine.startsWith("＃");
}

export function stripDuplicateStandaloneTagLines(body: string, tags: CopyTags) {
  const normalizedTags = normalizeCopyTags(tags);
  const knownTags = new Set(normalizedTags);
  if (!knownTags.size) {
    return body.trim();
  }

  return body
    .split(/\r?\n/)
    .filter((line) => {
      if (!isTagOnlyLine(line)) {
        return true;
      }
      const lineTags = parseTagText(line);
      return !lineTags.length || !lineTags.every((tag) => knownTags.has(tag));
    })
    .join("\n")
    .trim();
}

export function buildPlatformCopyText({ body, tags, title }: PlatformCopyInput) {
  const normalizedTags = normalizeCopyTags(tags);
  const cleanBody = stripDuplicateStandaloneTagLines(body, normalizedTags);
  const tagLine = formatTagLine(normalizedTags);
  return [title.trim(), cleanBody, tagLine].filter(Boolean).join("\n\n");
}
