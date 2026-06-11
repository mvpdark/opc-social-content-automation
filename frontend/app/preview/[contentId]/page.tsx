import { PublicPreviewClient } from "@/components/public-preview-client";

export default async function PublicPreviewPage({
  params
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;
  return <PublicPreviewClient contentId={contentId} />;
}
