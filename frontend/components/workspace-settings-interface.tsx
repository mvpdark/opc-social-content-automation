"use client";

import { memo } from "react";
import { Eye, EyeOff, Settings } from "lucide-react";
import { interfaceStyles, themeTemplates, type InterfaceStyle } from "@/lib/dashboard-data";
import { subtleCardClass, secondaryButtonClass } from "./workspace-utils";
import { IconBox, Panel, Pill, ThemeSwatches } from "./workspace-ui";

function settingsThemeHref(style: InterfaceStyle) {
  return `/?tab=settings&theme=${style}`;
}

export const SettingsInterfacePanel = memo(function SettingsInterfacePanel({
  interfaceStyle,
  showHelperText,
  onShowHelperTextChange
}: {
  interfaceStyle: InterfaceStyle;
  showHelperText: boolean;
  onShowHelperTextChange: (nextValue: boolean) => void;
}) {
  return (
    <Panel
      action={<Pill tone="green">设置入口固定保留</Pill>}
      helper="切换风格只影响视觉；导航、设置入口和主要按钮始终保留。"
      title="界面显示"
    >
      <div className="space-y-4">
        <section>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">运营模板</div>
              <div className="mt-1 text-xs text-muted">按工作场景快速套用合适风格。</div>
            </div>
            <div className="text-xs text-muted">当前共 {themeTemplates.length} 个模板。</div>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {themeTemplates.map((template, index) => {
              const selected = template.style === interfaceStyle;
              return (
                <a
                  aria-current={selected ? "true" : undefined}
                  aria-label={`${template.label}${selected ? "，当前推荐风格" : ""}`}
                  className={[
                    "workspace-theme-card",
                    "rounded-md border px-3 py-2 text-left transition",
                    selected
                      ? "border-steel bg-mist text-ink ring-1 ring-steel/25"
                      : "glass-subtle text-ink hover:border-steel/60"
                  ].join(" ")}
                  href={settingsThemeHref(template.style)}
                  key={`theme-template-${index}-${template.label}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{template.label}</span>
                    {selected ? <Pill tone="blue">当前</Pill> : null}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {template.description}
                  </span>
                  <ThemeSwatches compact style={template.style} />
                </a>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">全部主题</div>
              <div className="mt-1 text-xs text-muted">用于审稿、创作、采集和排障的完整视觉库。</div>
            </div>
            <div className="text-xs text-muted">当前共 {interfaceStyles.length} 种。</div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {interfaceStyles.map((style) => {
              const selected = style.id === interfaceStyle;
              return (
                <a
                  aria-current={selected ? "true" : undefined}
                  aria-label={`${style.label}${selected ? "，当前界面风格" : ""}`}
                  className={[
                    `theme-${style.id}`,
                    "workspace-theme-card",
                    "rounded-md border px-4 py-3 text-left transition",
                    selected
                      ? "border-steel bg-mist text-ink ring-1 ring-steel/25"
                      : "border-line bg-paper text-ink shadow-panel hover:border-steel/50"
                  ].join(" ")}
                  href={settingsThemeHref(style.id)}
                  key={style.id}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{style.label}</span>
                    {selected ? <Pill tone="blue">当前</Pill> : null}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {style.description}
                  </span>
                  <ThemeSwatches style={style.id} />
                </a>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className={`${subtleCardClass} p-4`}>
            <div className="flex items-start gap-3">
              <IconBox tone={showHelperText ? "green" : "amber"}>
                {showHelperText ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </IconBox>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">辅助说明</h3>
                  <Pill tone={showHelperText ? "green" : "amber"}>
                    {showHelperText ? "显示中" : "已隐藏"}
                  </Pill>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  控制顶部副标题和侧边说明的显示，不影响导航、设置入口和主要按钮。
                </p>
                <button
                  className={`${secondaryButtonClass} mt-4 h-9 px-3`}
                  onClick={() => onShowHelperTextChange(!showHelperText)}
                  type="button"
                >
                  {showHelperText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showHelperText ? "隐藏辅助说明" : "显示辅助说明"}
                </button>
              </div>
            </div>
          </div>

          <div className={`${subtleCardClass} p-4`}>
            <div className="flex items-start gap-3">
              <IconBox tone="blue">
                <Settings className="h-4 w-4" />
              </IconBox>
              <div>
                <h3 className="text-sm font-semibold">设置入口</h3>
                <p className="mt-2 text-xs leading-5 text-muted">
                  左侧导航的“设置”和顶部齿轮按钮不受隐藏状态影响，避免入口被自己藏掉。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
});
