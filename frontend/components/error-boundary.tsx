"use client";

import React from "react";

interface ViewErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ViewErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

export class ViewErrorBoundary extends React.Component<
  ViewErrorBoundaryProps,
  ViewErrorBoundaryState
> {
  constructor(props: ViewErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, resetKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ViewErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ViewErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="text-2xl font-bold text-ink">页面出了点问题</div>
          <p className="text-sm text-muted">
            {this.state.error?.message || "渲染时发生未知错误"}
          </p>
          <button
            className="rounded-full bg-coral px-6 py-2 text-sm font-semibold text-white"
            onClick={() => this.setState((prev) => ({ hasError: false, error: null, resetKey: prev.resetKey + 1 }))}
          >
            重试
          </button>
        </div>
      );
    }
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}
