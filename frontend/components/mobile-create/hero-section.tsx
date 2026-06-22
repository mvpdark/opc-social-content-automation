"use client";

import { Sparkles } from "lucide-react";

import { MOBILE_CREATE_CARD_BG } from "@/components/mobile-create-utils";

interface HeroSectionProps {
  heroProgressPercent: number;
  heroProgressLabel: string;
  heroProgressValue: string;
}

export function HeroSection({ heroProgressPercent, heroProgressLabel, heroProgressValue }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.90)] p-4 text-ink shadow-[0_18px_42px_rgba(31,58,49,0.10),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-85"
        style={{ backgroundImage: `url(${MOBILE_CREATE_CARD_BG})` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,252,244,0.94)_0%,rgba(255,252,244,0.76)_48%,rgba(255,252,244,0.36)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#ff2442]/[0.12] blur-2xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black text-moss">一键生成</div>
            <h2 className="mt-1 text-[25px] font-black leading-8">撰稿 + 封面图</h2>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/[0.84] bg-[rgba(255,253,247,0.78)] text-[#ff2442] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur-sm">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_74px] gap-2">
          <div className="rounded-[20px] border border-white/[0.84] bg-[rgba(255,253,247,0.76)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-sm">
            <div className="text-[11px] font-black text-ink/[0.45]">流程进度</div>
            <div className="mt-1 truncate text-xs font-black text-ink/[0.72]">{heroProgressLabel}</div>
          </div>
          <div className="flex items-center justify-center rounded-[20px] border border-[#ffdbe2] bg-[#fff5f7]/[0.86] text-center text-xs font-black text-[#a2152c] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-sm">
            {heroProgressValue}
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-[#ff2442] transition-all duration-500"
            style={{ width: `${heroProgressPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
}
