import { PublicPreviewClient } from "@/components/public-preview-client";
import { ViewErrorBoundary } from "@/components/error-boundary";

export default async function PublicPreviewPage({
  params
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;
  return (
    <ViewErrorBoundary>
      <PublicPreviewClient contentId={contentId} />
    </ViewErrorBoundary>
  );
}
