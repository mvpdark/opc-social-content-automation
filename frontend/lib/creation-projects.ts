type PillToneKey = "neutral" | "green" | "blue" | "red" | "amber";

export const creationProjects = [
  {
    id: "postgraduate-phd",
    title: "1.硕升博推广",
    category: "小红书图文获客",
    status: "可进入",
    statusTone: "green",
    description: "围绕硕升博、在职申博和水博路线，生成图文草稿、封面方向、标签和发布检查。",
    inputs: ["趋势参考", "申请人痛点", "项目卖点"],
    outputs: ["图文草稿", "封面方案", "发布清单"],
    workflow: ["采集参考", "一键撰稿+封面", "预览复制", "人工确认发布"],
    enabled: true
  },
  {
    id: "ecommerce-listing",
    title: "2.抖音商品自动化",
    category: "电商转化",
    status: "规划中",
    statusTone: "amber",
    description: "面向电商商品标题、卖点、详情页结构、FAQ 和客服话术。",
    inputs: ["商品信息", "卖点素材", "竞品参考"],
    outputs: ["上架文案", "详情页结构", "客服话术"],
    workflow: ["商品资料", "卖点提炼", "详情页草稿", "人工确认"],
    enabled: false
  },
  {
    id: "private-domain-sales",
    title: "3.私域商品自动化",
    category: "销售跟进",
    status: "规划中",
    statusTone: "amber",
    description: "面向朋友圈、社群跟进、异议处理和成交 SOP。",
    inputs: ["产品资料", "客户问题", "成交限制"],
    outputs: ["跟进 SOP", "群发文案", "异议处理"],
    workflow: ["客户分层", "跟进话术", "异议处理", "人工确认"],
    enabled: false
  }
] as const satisfies ReadonlyArray<{
  id: string;
  title: string;
  category: string;
  status: string;
  statusTone: PillToneKey;
  description: string;
  inputs: readonly string[];
  outputs: readonly string[];
  workflow: readonly string[];
  enabled: boolean;
}>;

export type CreationProjectId = (typeof creationProjects)[number]["id"];

export function findEnabledCreationProject(projectId: string | null) {
  return creationProjects.find((project) => project.enabled && project.id === projectId) ?? null;
}

export function updateCreationProjectQuery(projectId: CreationProjectId | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (projectId) {
    url.searchParams.set("project", projectId);
  } else {
    url.searchParams.delete("project");
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
