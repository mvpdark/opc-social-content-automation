export type GeneratedContent = {
  body: string;
  created_at?: string;
  id: number;
  platform: string;
  status: string;
  tags: string[] | null;
  title: string;
};

export type GeneratedImageAsset = {
  content_id: number;
  created_at?: string;
  created_by?: number | null;
  error?: string | null;
  id: number;
  image_url: string;
  prompt?: string | null;
  status: string;
  template?: string | null;
};

export function isGeneratedContent(value: unknown): value is GeneratedContent {
  if (!value || typeof value !== "object") {
    return false;
  }
  const content = value as Partial<GeneratedContent>;
  return (
    typeof content.body === "string" &&
    typeof content.id === "number" &&
    typeof content.platform === "string" &&
    typeof content.status === "string" &&
    typeof content.title === "string" &&
    (Array.isArray(content.tags) || content.tags === null || content.tags === undefined)
  );
}

export function isGeneratedImageAsset(value: unknown): value is GeneratedImageAsset {
  if (!value || typeof value !== "object") {
    return false;
  }
  const image = value as Partial<GeneratedImageAsset>;
  return (
    typeof image.content_id === "number" &&
    typeof image.id === "number" &&
    typeof image.image_url === "string" &&
    typeof image.status === "string"
  );
}
