"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("OPC route error boundary", {
        digest: error.digest,
        message: error.message
      });
    }
  }, [error.digest, error.message]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-paper px-6 py-12 text-ink">
      <section
        aria-labelledby="app-error-title"
        className="w-full max-w-xl rounded-md border border-line bg-white/80 p-6 shadow-sm"
        data-testid="app-error-boundary"
      >
        <AlertCircle className="mb-3 h-8 w-8 text-moss" strokeWidth={2.5} />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          OPC recovery
        </p>
        <h1 id="app-error-title" className="mt-3 text-2xl font-black leading-8">
          页面暂时无法继续
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted" data-testid="app-error-message">
          当前操作没有被提交或发布。请重试，或返回工作台重新检查草稿、封面和人工审核状态。
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-muted" data-testid="app-error-digest">
            错误编号：{error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper"
            data-testid="app-error-reset"
            onClick={reset}
            type="button"
          >
            重试当前页面
          </button>
          <Link
            className="rounded-md border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink"
            data-testid="app-error-home"
            href="/?theme=mint"
          >
            返回 OPC 工作台
          </Link>
        </div>
      </section>
    </main>
  );
}
