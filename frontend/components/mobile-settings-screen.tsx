import { LogOut, ShieldCheck } from "lucide-react";

import { MobilePanel, SettingRow } from "@/components/mobile-ui";
import {
  providerBindingDefaultsFromStatuses,
  type ProviderStatusItem
} from "@/lib/provider-settings";

const MOBILE_COLLECTION_COLLAGE = "/mobile-assets/collection-collage.png";

type SettingsScreenProps = {
  mobileAccount: string;
  onAction: (message: string) => void;
  onLogout: () => void;
  providerStatuses: ProviderStatusItem[];
};

export function SettingsScreen({
  mobileAccount,
  onAction,
  onLogout,
  providerStatuses
}: SettingsScreenProps) {
  const providerBindings = providerBindingDefaultsFromStatuses(providerStatuses);
  const providerStatusLoaded = providerStatuses.length > 0;
  const providerSummary = !providerStatusLoaded
    ? "正在读取服务状态。"
    : providerBindings.draft && providerBindings.image && providerBindings.rewrite
      ? "默认服务已就绪，生成链路可直接使用。"
      : "默认服务未完整，请在电脑端工作台完成授权后再生成。";
  const providerChecks = [
    { bound: providerBindings.draft, label: "撰稿" },
    { bound: providerBindings.image, label: "图片" },
    { bound: providerBindings.rewrite, label: "改写" }
  ];

  return (
    <div className="space-y-4">
      <section className="relative mt-8 overflow-hidden rounded-[30px] border border-white/[0.88] bg-[rgba(255,253,247,0.92)] p-5 text-ink shadow-[0_16px_38px_rgba(31,58,49,0.10),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-sm">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-28"
          style={{ backgroundImage: `url(${MOBILE_COLLECTION_COLLAGE})` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,252,244,0.96)_0%,rgba(255,252,244,0.88)_48%,rgba(255,252,244,0.70)_100%)]" />
        <div aria-hidden="true" className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[#38bf6b]/[0.12] blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black text-moss">当前账号</div>
              <h2 className="mt-1 text-[24px] font-black leading-7">{mobileAccount}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-muted">{providerSummary}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/[0.84] bg-[rgba(231,242,234,0.88)] text-moss shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {providerChecks.map(({ bound, label }) => (
              <div
                className={`rounded-[20px] border border-white/[0.72] px-3 py-2 text-center text-xs font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.80)] ${
                  bound ? "bg-[#e7f2ea]/[0.88] text-moss" : "bg-[#fff6d8]/[0.88] text-[#8a5a00]"
                }`}
                key={`provider-binding-${label}`}
              >
                <div>{label}</div>
                <div className="mt-1 text-[10px]">{bound ? "已绑定" : "待授权"}</div>
              </div>
            ))}
          </div>
          <button
            className="mt-4 flex h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.88)] text-sm font-black text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] active:scale-[0.99]"
            data-testid="mobile-logout"
            onClick={onLogout}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            退出当前账号
          </button>
        </div>
      </section>

      <MobilePanel title="安全规则">
        <div className="space-y-2">
          <SettingRow label="采集先于生成" onClick={() => onAction("安全规则已确认：采集先于生成。")} state="启用" testId="gate-collect-first" positive />
          <SettingRow label="发布需人工确认" onClick={() => onAction("安全规则已确认：发布仍需人工确认。")} state="强制" testId="gate-manual-review" positive />
          <SettingRow label="图片标题需复核" onClick={() => onAction("安全规则已确认：图片标题需要复核。")} state="提醒" testId="gate-cover-review" />
        </div>
      </MobilePanel>
    </div>
  );
}
