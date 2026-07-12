"use client";

import { useEffect, type CSSProperties } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const ERROR_MAIN_STYLE: CSSProperties = {
  alignItems: "center",
  background: "rgb(var(--paper, 238 248 244))",
  color: "rgb(var(--ink, 18 49 45))",
  display: "flex",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
  justifyContent: "center",
  minHeight: "100dvh",
  padding: 24
};

const ERROR_SECTION_STYLE: CSSProperties = {
  background: "rgba(255, 255, 255, 0.86)",
  border: "1px solid rgb(var(--line, 201 223 215))",
  borderRadius: 8,
  boxShadow: "0 18px 50px rgba(18, 49, 45, 0.12)",
  maxWidth: 560,
  padding: 24,
  width: "100%"
};

const ERROR_LABEL_STYLE: CSSProperties = {
  color: "rgb(var(--muted, 95 114 109))",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.16em",
  margin: 0,
  textTransform: "uppercase"
};

const ERROR_ICON_STYLE: CSSProperties = {
  color: "rgb(var(--moss, 35 133 79))",
  height: 32,
  marginBottom: 12,
  width: 32
};

const ERROR_TITLE_STYLE: CSSProperties = { fontSize: 24, lineHeight: "32px", margin: "12px 0 0" };

const ERROR_MESSAGE_STYLE: CSSProperties = { color: "rgb(var(--muted, 95 114 109))", fontSize: 14, lineHeight: "24px", margin: "12px 0 0" };

const ERROR_DIGEST_STYLE: CSSProperties = { color: "rgb(var(--muted, 95 114 109))", fontSize: 12, margin: "12px 0 0" };

const ERROR_ACTIONS_STYLE: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 };

const ERROR_RESET_BUTTON_STYLE: CSSProperties = {
  background: "rgb(var(--ink, 18 49 45))",
  border: 0,
  borderRadius: 6,
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  padding: "10px 16px"
};

const ERROR_HOME_LINK_STYLE: CSSProperties = {
  background: "rgb(var(--paper, 238 248 244))",
  border: "1px solid rgb(var(--line, 201 223 215))",
  borderRadius: 6,
  color: "rgb(var(--ink, 18 49 45))",
  fontSize: 14,
  fontWeight: 700,
  padding: "10px 16px",
  textDecoration: "none"
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
          style={ERROR_MAIN_STYLE}
        >
          <section
            aria-labelledby="global-error-title"
            data-testid="global-error-boundary"
            style={ERROR_SECTION_STYLE}
          >
            <svg
              fill="none"
              height="32"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              style={ERROR_ICON_STYLE}
              viewBox="0 0 24 24"
              width="32"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <p
              style={ERROR_LABEL_STYLE}
            >
              OPC recovery
            </p>
            <h1
              id="global-error-title"
              style={ERROR_TITLE_STYLE}
            >
              应用暂时无法继续
            </h1>
            <p
              data-testid="global-error-message"
              style={ERROR_MESSAGE_STYLE}
            >
              当前操作没有被提交或发布。请重试，或重新打开 OPC 工作台继续人工审核流程。
            </p>
            {error.digest ? (
              <p
                data-testid="global-error-digest"
                style={ERROR_DIGEST_STYLE}
              >
                错误编号：{error.digest}
              </p>
            ) : null}
            <div style={ERROR_ACTIONS_STYLE}>
              <button
                data-testid="global-error-reset"
                onClick={reset}
                style={ERROR_RESET_BUTTON_STYLE}
                type="button"
              >
                重试当前页面
              </button>
              <a
                data-testid="global-error-home"
                href="/?theme=mint"
                style={ERROR_HOME_LINK_STYLE}
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
