"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bell,
  BookOpenText,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Database,
  Home,
  Image,
  Layers3,
  PenLine,
  Radar,
  Search,
  Settings,
  ShieldCheck,
  Sparkles
} from "lucide-react";

type MobileTab = "home" | "collect" | "create" | "review" | "settings";

const bottomTabs: Array<{ id: MobileTab; icon: typeof Home; label: string }> = [
  { id: "home", icon: Home, label: "首页" },
  { id: "collect", icon: Radar, label: "采集" },
  { id: "create", icon: PenLine, label: "创作" },
  { id: "review", icon: ClipboardCheck, label: "审核" },
  { id: "settings", icon: Settings, label: "设置" }
];

const workItems = [
  { label: "补高赞图文参考", state: "待采集", icon: Radar },
  { label: "生成硕升博草稿", state: "PC 端开始", icon: PenLine },
  { label: "复核封面标题", state: "待确认", icon: Image }
];

const sampleReferences = [
  {
    title: "不是先套磁，先确认这 3 件事",
    meta: "写作参考 · 来源待 PC 确认",
    cue: "反常识开头 + 三点清单"
  },
  {
    title: "硕升博申请别急着群发邮件",
    meta: "结构参考 · 非采集结果",
    cue: "先打断误区，再给动作"
  },
  {
    title: "导师匹配前要做的方向自查",
    meta: "封面参考 · 待人工复核",
    cue: "步骤化封面 + 低噪正文"
  }
];

const reviewCards = [
  { title: "硕升博申请顺序", helper: "正文已生成，等待人工审核", risk: "事实边界", tone: "amber" },
  { title: "封面标题准确性", helper: "图片文字需二次确认", risk: "错字风险", tone: "coral" },
  { title: "高赞样本参考", helper: "来源待人工确认", risk: "来源门控", tone: "steel" }
];

function getPcReturnHref() {
  if (typeof window === "undefined") {
    return "/";
  }
  const from = new URLSearchParams(window.location.search).get("from");
  if (from && from.startsWith("/") && !from.startsWith("//")) {
    return from;
  }
  return "/";
}

export default function AndroidPreviewPage() {
  const [activeTab, setActiveTab] = useState<MobileTab>("home");

  return (
    <main className="min-h-screen bg-[#dceee7] px-0 py-0 text-ink sm:px-6 sm:py-6">
      <div className="relative mx-auto h-screen max-w-[430px] overflow-hidden bg-[#f6fbf6] shadow-soft sm:h-[calc(100vh-48px)] sm:min-h-0 sm:rounded-[28px] sm:border sm:border-white/80">
        <div className="flex h-full flex-col">
          <StatusBar />
          <MobileHeader activeTab={activeTab} />
          <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-3">
            {activeTab === "home" ? <HomeScreen onChangeTab={setActiveTab} /> : null}
            {activeTab === "collect" ? <CollectScreen /> : null}
            {activeTab === "create" ? <CreateScreen /> : null}
            {activeTab === "review" ? <ReviewScreen /> : null}
            {activeTab === "settings" ? <SettingsScreen /> : null}
          </section>
          <BottomNav activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </div>
    </main>
  );
}

function StatusBar() {
  return (
    <div className="flex h-8 items-center justify-between px-5 text-[11px] font-semibold text-ink">
      <span>9:41</span>
      <span>5G  82%</span>
    </div>
  );
}

function MobileHeader({ activeTab }: { activeTab: MobileTab }) {
  const titles: Record<MobileTab, string> = {
    home: "今日工作台",
    collect: "趋势采集",
    create: "内容创作",
    review: "人工审核",
    settings: "设置"
  };

  return (
    <header className="border-b border-[#d6e8df] bg-white/90 px-4 pb-3 pt-2 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <button
          aria-label="返回 PC 工作台"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-[#d6e8df] bg-[#f6fbf6] text-ink"
          onClick={() => {
            window.location.href = getPcReturnHref();
          }}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-moss">
            OPC Mobile
          </div>
          <h1 className="truncate text-lg font-semibold leading-6">{titles[activeTab]}</h1>
        </div>
        <button
          aria-label="通知，暂未接入"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-[#d6e8df] bg-[#f6fbf6] text-ink disabled:cursor-not-allowed disabled:opacity-55"
          disabled
          title="通知中心暂未接入"
          type="button"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function HomeScreen({ onChangeTab }: { onChangeTab: (tab: MobileTab) => void }) {
  return (
    <div className="space-y-4">
      <section className="rounded-md bg-ink p-4 text-paper">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-white/70">今天优先级</div>
            <h2 className="mt-1 text-2xl font-semibold leading-8">先采集，再生成</h2>
            <p className="mt-2 text-sm leading-6 text-white/75">
              当前适合补充高赞图文参考，然后启动一篇硕升博草稿。
            </p>
          </div>
          <div className="rounded-md bg-white/12 px-3 py-2 text-center">
            <div className="text-2xl font-semibold">3</div>
            <div className="text-[11px] text-white/65">待处理</div>
          </div>
        </div>
        <button
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white text-sm font-semibold text-ink"
          onClick={() => onChangeTab("create")}
          type="button"
        >
          <PenLine className="h-4 w-4" />
          查看创作预览
        </button>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="趋势素材" value="0" />
        <Metric label="知识条目" value="0" tone="green" />
        <Metric label="待审" value="0" tone="coral" />
      </div>

      <MobilePanel title="今日任务" action="全部">
        <div className="space-y-2">
          {workItems.map((item) => (
            <TaskRow key={item.label} icon={<item.icon className="h-4 w-4" />} label={item.label} state={item.state} />
          ))}
        </div>
      </MobilePanel>

      <MobilePanel title="生产进度">
        <div className="grid grid-cols-3 gap-2">
          <StepTile icon={<Database className="h-4 w-4" />} label="采集" state="当前" />
          <StepTile icon={<BookOpenText className="h-4 w-4" />} label="知识库" state="就绪" />
          <StepTile icon={<ShieldCheck className="h-4 w-4" />} label="审核" state="强制" />
        </div>
      </MobilePanel>
    </div>
  );
}

function CollectScreen() {
  const [platform, setPlatform] = useState<"douyin" | "xiaohongshu">("xiaohongshu");

  return (
    <div className="space-y-4">
      <MobilePanel title="公开图文搜索">
        <div className="rounded-md border border-[#d6e8df] bg-white px-3 py-3">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Search className="h-4 w-4" />
            硕升博 高赞图文
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ModeChip
            active={platform === "xiaohongshu"}
            label="小红书"
            onClick={() => setPlatform("xiaohongshu")}
          />
          <ModeChip
            active={platform === "douyin"}
            label="抖音图文"
            onClick={() => setPlatform("douyin")}
          />
        </div>
        <button
          aria-label="回 PC 创建公开采集任务"
          className="mt-3 h-11 w-full rounded-md bg-ink text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-55"
          disabled
          type="button"
        >
          回 PC 创建任务
        </button>
        <p className="mt-2 text-[11px] leading-5 text-muted">
          采集任务需在 PC 工作台创建。
        </p>
      </MobilePanel>

      <MobilePanel title="高赞参考">
        <div className="space-y-3">
          {sampleReferences.map((item) => (
            <div key={item.title} className="rounded-md border border-[#d6e8df] bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold leading-5">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted">{item.meta}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 text-muted" />
              </div>
              <div className="mt-3 rounded-md bg-[#fff6e3] px-3 py-2 text-xs font-medium text-[#8a5d16]">
                {item.cue}
              </div>
            </div>
          ))}
        </div>
      </MobilePanel>
    </div>
  );
}

function CreateScreen() {
  const [contentMode, setContentMode] = useState<"short" | "xiaohongshu">("xiaohongshu");

  return (
    <div className="space-y-4">
      <MobilePanel title="创作参考" action="需 PC 生成">
        <label className="block">
          <span className="text-xs font-medium text-muted">选题</span>
          <div className="mt-2 rounded-md border border-[#d6e8df] bg-white px-3 py-3 text-sm font-medium">
            硕升博申请第一步，不是先套磁
          </div>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ModeChip
            active={contentMode === "xiaohongshu"}
            label="小红书图文"
            onClick={() => setContentMode("xiaohongshu")}
          />
          <ModeChip
            active={contentMode === "short"}
            label="短段正文"
            onClick={() => setContentMode("short")}
          />
        </div>
        <button
          aria-label="回 PC 生成图文草稿"
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-55"
          disabled
          type="button"
        >
          <Sparkles className="h-4 w-4" />
          回 PC 生成
        </button>
        <p className="mt-2 text-[11px] leading-5 text-muted">
          真实生成请回到 PC 工作台。
        </p>
      </MobilePanel>

      <MobilePanel title="草稿参考版式" action="非生成结果">
        <div className="rounded-md border border-[#d6e8df] bg-white p-3">
          <div className="text-xs font-medium text-steel">
            {contentMode === "xiaohongshu" ? "小红书图文" : "短段正文"}
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-6">不是先套磁，先想清楚这 3 件事</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            很多人一上来就急着群发邮件，但研究方向、读博动机和导师匹配没想清楚，反而容易浪费第一印象。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["硕升博", "博士申请", "研究方向"].map((tag) => (
              <span key={tag} className="rounded-md bg-[#e5f2ec] px-2 py-1 text-xs font-medium text-moss">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </MobilePanel>

      <CoverReferenceBrief />
    </div>
  );
}

function ReviewScreen() {
  return (
    <div className="space-y-4">
      <MobilePanel title="审核队列" action="3">
        <div className="space-y-3">
          {reviewCards.map((item) => (
            <div key={item.title} className="rounded-md border border-[#d6e8df] bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted">{item.helper}</p>
                </div>
                <span className={["rounded-md px-2 py-1 text-[11px] font-semibold", riskTone(item.tone)].join(" ")}>
                  {item.risk}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  aria-label="退回，需在 PC 审核工作台处理"
                  className="h-9 rounded-md border border-[#d6e8df] bg-white text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-55"
                  disabled
                  type="button"
                >
                  退回
                </button>
                <button
                  aria-label="通过，需在 PC 审核工作台处理"
                  className="h-9 rounded-md bg-ink text-sm font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-55"
                  disabled
                  type="button"
                >
                  通过
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-muted">
                移动端仅展示队列，处理需回 PC。
              </p>
            </div>
          ))}
        </div>
      </MobilePanel>
    </div>
  );
}

function SettingsScreen() {
  return (
    <div className="space-y-4">
      <MobilePanel title="配置状态" action="只读">
        <p className="mb-3 text-xs leading-5 text-muted">
          移动端预览不读取密钥状态，真实配置请回 PC 设置页查看。
        </p>
        <div className="space-y-2">
          <SettingRow label="工作台令牌" state="回 PC 查看" />
          <SettingRow label="撰稿服务" state="PC 配置" />
          <SettingRow label="图片服务" state="PC 配置" />
          <SettingRow label="改写服务" state="PC 配置" />
        </div>
      </MobilePanel>
      <MobilePanel title="安全门">
        <div className="space-y-2">
          <SettingRow label="采集先于生成" state="启用" positive />
          <SettingRow label="发布需人工审核" state="强制" positive />
          <SettingRow label="图片标题需复核" state="提醒" />
        </div>
      </MobilePanel>
    </div>
  );
}

function BottomNav({ activeTab, onChange }: { activeTab: MobileTab; onChange: (tab: MobileTab) => void }) {
  return (
    <nav
      aria-label="安卓端主导航"
      className="absolute bottom-0 left-0 right-0 z-20 border-t border-[#d6e8df] bg-white/95 px-3 pb-3 pt-2 backdrop-blur sm:rounded-b-[28px]"
    >
      <div className="grid grid-cols-5 gap-1">
        {bottomTabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              aria-label={`${tab.label}${active ? "，当前页面" : ""}`}
              aria-pressed={active}
              key={tab.id}
              className={[
                "flex h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold",
                active ? "bg-[#e5f2ec] text-moss" : "text-muted"
              ].join(" ")}
              onClick={() => onChange(tab.id)}
              type="button"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function MobilePanel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className="rounded-md border border-[#d6e8df] bg-white/92 p-4 shadow-panel">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {typeof action === "string" ? (
          <span className="text-xs font-semibold text-moss">{action}</span>
        ) : (
          action
        )}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, tone = "blue", value }: { label: string; tone?: "blue" | "coral" | "green"; value: string }) {
  const toneClass = {
    blue: "border-steel/30 bg-steel/10 text-steel",
    coral: "border-coral/30 bg-coral/10 text-coral",
    green: "border-moss/30 bg-moss/10 text-moss"
  };
  return (
    <div className={["rounded-md border p-3", toneClass[tone]].join(" ")}>
      <div className="text-xl font-semibold">{value}</div>
      <div className="mt-1 text-[11px] font-medium">{label}</div>
    </div>
  );
}

function TaskRow({ icon, label, state }: { icon: ReactNode; label: string; state: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-[#d6e8df] bg-white px-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#e5f2ec] text-moss">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted">{state}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted" />
    </div>
  );
}

function StepTile({ icon, label, state }: { icon: ReactNode; label: string; state: string }) {
  return (
    <div className="rounded-md border border-[#d6e8df] bg-[#f6fbf6] p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-steel">
        {icon}
      </div>
      <div className="mt-3 text-sm font-semibold">{label}</div>
      <div className="mt-1 text-xs text-muted">{state}</div>
    </div>
  );
}

function ModeChip({
  active = false,
  label,
  onClick
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={[
        "h-10 rounded-md border text-sm font-semibold",
        active ? "border-moss bg-[#e5f2ec] text-moss" : "border-[#d6e8df] bg-white text-muted"
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function CoverReferenceBrief() {
  return (
    <section className="overflow-hidden rounded-md border border-[#d6e8df] bg-[linear-gradient(160deg,#fff7df,#d9f1e5_48%,#f7cdbf)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-steel">封面参考 brief</span>
        <span className="rounded-md bg-white/75 px-2 py-1 text-[11px] font-semibold text-ink/70">
          非生成结果
        </span>
        <Layers3 className="h-4 w-4 text-steel" />
      </div>
      <div className="mt-5 text-3xl font-black leading-tight text-ink">
        不是先套磁
        <br />
        先想清楚
        <br />
        这 3 件事
      </div>
      <div className="mt-5 space-y-2 text-xs font-semibold text-ink/70">
        <div className="rounded-md bg-white/85 px-3 py-2">1. 明确研究方向</div>
        <div className="rounded-md bg-white/85 px-3 py-2">2. 匹配导师项目</div>
        <div className="rounded-md bg-white/85 px-3 py-2">3. 再定制套磁</div>
      </div>
    </section>
  );
}

function SettingRow({ label, positive = false, state }: { label: string; positive?: boolean; state: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[#d6e8df] bg-white px-3 py-3">
      <div className="flex items-center gap-3">
        <CheckCircle2 className={["h-4 w-4", positive ? "text-moss" : "text-amber"].join(" ")} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <span className="text-xs font-medium text-muted">{state}</span>
    </div>
  );
}

function riskTone(tone: string) {
  if (tone === "coral") {
    return "bg-coral/10 text-coral";
  }
  if (tone === "steel") {
    return "bg-steel/10 text-steel";
  }
  return "bg-amber/10 text-amber";
}
