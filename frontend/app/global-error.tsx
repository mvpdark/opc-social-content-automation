"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("OPC global error boundary", {
        digest: error.digest,
        message: error.message
      });
    }
  }, [error.digest, error.message]);

  return (
    <html lang="zh-CN">
      <body>
        <main
          style={{
            alignItems: "center",
            background: "#eef8f4",
            color: "#12312d",
            display: "flex",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
            justifyContent: "center",
            minHeight: "100dvh",
            padding: 24
          }}
        >
          <section
            aria-labelledby="global-error-title"
            data-testid="global-error-boundary"
            style={{
              background: "rgba(255, 255, 255, 0.86)",
              border: "1px solid #c9dfd7",
              borderRadius: 8,
              boxShadow: "0 18px 50px rgba(18, 49, 45, 0.12)",
              maxWidth: 560,
              padding: 24,
              width: "100%"
            }}
          >
            <p
              style={{
                color: "#5f726d",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.16em",
                margin: 0,
                textTransform: "uppercase"
              }}
            >
              OPC recovery
            </p>
            <h1
              id="global-error-title"
              style={{ fontSize: 24, lineHeight: "32px", margin: "12px 0 0" }}
            >
              应用暂时无法继续
            </h1>
            <p
              data-testid="global-error-message"
              style={{ color: "#5f726d", fontSize: 14, lineHeight: "24px", margin: "12px 0 0" }}
            >
              当前操作没有被提交或发布。请重试，或重新打开 OPC 工作台继续人工审核流程。
            </p>
            {error.digest ? (
              <p
                data-testid="global-error-digest"
                style={{ color: "#5f726d", fontSize: 12, margin: "12px 0 0" }}
              >
                错误编号：{error.digest}
              </p>
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
              <button
                data-testid="global-error-reset"
                onClick={reset}
                style={{
                  background: "#12312d",
                  border: 0,
                  borderRadius: 6,
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "10px 16px"
                }}
                type="button"
              >
                重试当前页面
              </button>
              <a
                data-testid="global-error-home"
                href="/?theme=mint"
                style={{
                  background: "#eef8f4",
                  border: "1px solid #c9dfd7",
                  borderRadius: 6,
                  color: "#12312d",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "10px 16px",
                  textDecoration: "none"
                }}
              >
                返回 OPC 工作台
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
