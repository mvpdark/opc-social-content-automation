import { ChevronRight } from "lucide-react";

import { MobilePanel } from "@/components/mobile-ui";

const mobileCreationProjects = [
  {
    id: "postgraduate-phd",
    title: "1.硕升博推广",
    iconSrc: "/platform-icons/xiaohongshu-app.webp",
    category: "小红书图文获客",
    status: "可进入",
    description: "硕升博内容获客：生成图文草稿、封面方向和发布清单。",
    inputs: ["趋势参考", "申请人痛点", "项目卖点"],
    outputs: ["图文草稿", "封面方案", "发布清单"],
    workflow: ["采集参考", "一键撰稿+封面", "预览复制", "人工确认发布"],
    enabled: true
  },
  {
    id: "ecommerce-listing",
    title: "2.抖音商品自动化",
    iconSrc: "/platform-icons/douyin-app.webp",
    category: "电商转化",
    status: "规划中",
    description: "面向商品标题、卖点、详情页结构、FAQ 和客服话术。",
    inputs: ["商品信息", "卖点素材", "竞品参考"],
    outputs: ["上架文案", "详情页结构", "客服话术"],
    workflow: ["商品资料", "卖点提炼", "详情页草稿", "人工确认"],
    enabled: false
  },
  {
    id: "private-domain-sales",
    title: "3.私域商品自动化",
    iconSrc: "/platform-icons/wechat-app.webp",
    category: "销售跟进",
    status: "规划中",
    description: "面向朋友圈、社群跟进、异议处理和成交 SOP。",
    inputs: ["产品资料", "客户问题", "成交限制"],
    outputs: ["跟进 SOP", "群发文案", "异议处理"],
    workflow: ["客户分层", "跟进话术", "异议处理", "人工确认"],
    enabled: false
  }
] as const;

export type MobileCreationProjectId = (typeof mobileCreationProjects)[number]["id"];

export function findEnabledMobileCreationProject(projectId: string | null) {
  return mobileCreationProjects.find((project) => project.enabled && project.id === projectId) ?? null;
}

function mobileCreationProjectActionClass(projectId: MobileCreationProjectId, enabled: boolean) {
  if (!enabled) {
    return "border border-white/[0.84] bg-[rgba(255,253,247,0.86)] text-muted";
  }
  if (projectId === "postgraduate-phd") {
    return "border border-[#ff2442]/[0.38] bg-white text-[#ff2442]";
  }
  if (projectId === "ecommerce-listing") {
    return "border border-[#171a18] bg-[#171a18] text-white";
  }
  return "border border-[#23854f]/[0.35] bg-[#e7f2ea] text-moss";
}

export function MobileCreationProjectGateway({
  draftCount,
  onSelect,
  todayDraftCount
}: {
  draftCount: number;
  onSelect: (projectId: MobileCreationProjectId) => void;
  todayDraftCount: number;
}) {
  const projectStats = [
    { label: "草稿总数", value: String(draftCount), tone: "text-moss" },
    { label: "项目数", value: String(mobileCreationProjects.length), tone: "text-[#e58a00]" },
    { label: "今日生成", value: String(todayDraftCount), tone: "text-[#1d72d2]" },
    { label: "已发布", value: "0", tone: "text-moss" }
  ];

  return (
    <div className="space-y-4" data-testid="mobile-creation-project-gateway">
      <section className="-mx-4 -mt-3 mb-[-8px] flex min-h-[260px] flex-col justify-end overflow-hidden px-8 pb-6 pt-20 text-center">
        <div className="mx-auto mb-2 h-1 w-28 rounded-full bg-[#5ea66b]/[0.60]" />
        <h2 className="text-[30px] font-black leading-9 text-ink drop-shadow-[0_1px_0_rgba(255,255,255,0.88)]">
          一键创建，高效出稿
        </h2>
        <p className="mt-2 text-[15px] font-semibold leading-6 text-ink/[0.58]">
          从灵感到草稿，只需一步
        </p>
      </section>

      <div className="space-y-3">
        {mobileCreationProjects.map((project) => (
          <button
            aria-label={`${project.enabled ? "进入" : "查看"}${project.title}${project.enabled ? "创作流程" : "规划状态"}`}
            className="flex min-h-[94px] w-full touch-manipulation items-center gap-3 rounded-[30px] border border-white/[0.90] bg-[rgba(255,253,247,0.93)] px-4 py-3.5 text-left shadow-[0_14px_34px_rgba(31,58,49,0.10),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-sm active:scale-[0.99]"
            data-testid={`mobile-creation-project-${project.id}`}
            key={project.id}
            onClick={() => onSelect(project.id)}
            type="button"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[18px] shadow-[0_14px_28px_rgba(31,58,49,0.14)] ring-1 ring-black/10">
              <img alt="" className="h-full w-full object-cover" src={project.iconSrc} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-black leading-6">{project.title}</span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-muted">{project.category}</span>
            </span>
            <span
              className={[
                "inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-full px-3 text-xs font-black",
                mobileCreationProjectActionClass(project.id, project.enabled)
              ].join(" ")}
            >
              {project.enabled ? "进入创作" : project.status}
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </button>
        ))}
      </div>

      <MobilePanel
        title="项目状态"
        action={draftCount ? "已有草稿" : "待生成"}
      >
        <div className="grid grid-cols-4 gap-2">
          {projectStats.map((item) => (
            <div
              className="rounded-[20px] border border-white/[0.84] bg-[rgba(255,253,247,0.86)] px-2 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]"
              key={`create-stat-${item.label}`}
            >
              <div className={`text-2xl font-black leading-7 ${item.tone}`}>{item.value}</div>
              <div className="mt-1 text-[10px] font-bold text-muted">{item.label}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-[20px] bg-[#fff6d8]/[0.78] px-3 py-2 text-xs font-medium leading-5 text-[#8a5d16]">
          发布仍需人工确认，不会自动发布，也不会伪造采集、图片或效果数据。
        </p>
      </MobilePanel>
    </div>
  );
}
