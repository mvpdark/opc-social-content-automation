"use client";

import { memo, useEffect, useState } from "react";
import { Image } from "lucide-react";

export const CoverImagePreview = memo(function CoverImagePreview({
  alt,
  className,
  src,
  testId
}: {
  alt: string;
  className: string;
  src: string;
  testId: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center gap-2 bg-mist px-5 text-center text-xs font-semibold text-ink/[0.65]`}
        data-testid={`${testId}-fallback`}
      >
        <Image className="h-7 w-7 text-steel" />
        <span>封面图加载失败</span>
        <span className="text-[11px] font-medium text-ink/[0.45]">请重新生成封面或检查图片服务</span>
      </div>
    );
  }

  return (
    <img
      alt={alt}
      className={className}
      data-testid={testId}
      decoding="async"
      loading="lazy"
      onError={() => setFailed(true)}
      src={src}
    />
  );
});
