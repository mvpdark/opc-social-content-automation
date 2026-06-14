"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ChevronRight } from "lucide-react";

export function MobilePanel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className="rounded-[28px] border border-white/[0.88] bg-[rgba(255,253,247,0.88)] p-4 shadow-[0_12px_32px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-black">{title}</h2>
        {typeof action === "string" ? (
          <span className="rounded-full bg-[#e7f2ea]/[0.90] px-2.5 py-1 text-xs font-black text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            {action}
          </span>
        ) : (
          action
        )}
      </div>
      {children}
    </section>
  );
}

export function MobileOverlayPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

export function Metric({
  label,
  onClick,
  testId,
  tone = "blue",
  value
}: {
  label: string;
  onClick: () => void;
  testId: string;
  tone?: "blue" | "coral" | "green";
  value: string;
}) {
  const toneClass = {
    blue: "bg-[#edf5f8] text-steel",
    coral: "bg-[#fff1ec] text-coral",
    green: "bg-[#e7f2ea] text-moss"
  };
  return (
    <button
      className={[
        "min-h-[82px] touch-manipulation rounded-[24px] border border-white/[0.82] p-3 text-left shadow-[0_10px_24px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.82)] active:scale-[0.98]",
        toneClass[tone]
      ].join(" ")}
      data-testid={testId}
      onClick={onClick}
      type="button"
    >
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-[11px] font-bold">{label}</div>
    </button>
  );
}

export function TaskRow({
  icon,
  label,
  onClick,
  state,
  testId
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  state: string;
  testId: string;
}) {
  return (
    <button
      className="flex min-h-[70px] w-full touch-manipulation items-center gap-3 rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.88)] px-3.5 py-3 text-left shadow-[0_10px_26px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.86)] active:scale-[0.99] active:border-moss"
      data-testid={testId}
      onClick={onClick}
      type="button"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#e7f2ea] text-moss">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black">{label}</div>
        <div className="mt-0.5 text-xs font-medium text-muted">{state}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted" />
    </button>
  );
}

export function StepTile({
  icon,
  label,
  onClick,
  state,
  testId
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  state: string;
  testId: string;
}) {
  return (
    <button
      className="min-h-[118px] touch-manipulation rounded-[24px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] p-3 text-left shadow-[0_10px_26px_rgba(31,58,49,0.06),inset_0_1px_0_rgba(255,255,255,0.84)] active:scale-[0.98] active:border-moss"
      data-testid={testId}
      onClick={onClick}
      type="button"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-white text-steel shadow-[0_8px_18px_rgba(31,58,49,0.08)]">
        {icon}
      </div>
      <div className="mt-3 text-sm font-black">{label}</div>
      <div className="mt-1 text-xs font-medium text-muted">{state}</div>
    </button>
  );
}

export function ModeChip({
  active = false,
  label,
  onClick,
  testId
}: {
  active?: boolean;
  label: ReactNode;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      aria-pressed={active}
      className={[
        "min-h-12 touch-manipulation rounded-full border px-3 text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] transition active:scale-[0.98]",
        active
          ? "border-[#23854f] bg-[#23854f] text-white shadow-[0_12px_26px_rgba(35,133,79,0.18)]"
          : "border-white/[0.84] bg-[rgba(255,253,247,0.88)] text-muted active:bg-white"
      ].join(" ")}
      data-testid={testId}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function SettingRow({
  label,
  onClick,
  positive = false,
  state,
  testId
}: {
  label: string;
  onClick: () => void;
  positive?: boolean;
  state: string;
  testId: string;
}) {
  return (
    <button
      className="flex min-h-[56px] w-full touch-manipulation items-center justify-between gap-3 rounded-full border border-[#d6e8df] bg-white px-4 py-3 text-left active:scale-[0.99] active:border-moss"
      data-testid={testId}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center gap-3">
        <CheckCircle2 className={["h-4 w-4", positive ? "text-moss" : "text-amber"].join(" ")} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <span className="shrink-0 rounded-full bg-[#eef6f1] px-2.5 py-1 text-xs font-semibold text-muted">{state}</span>
    </button>
  );
}
