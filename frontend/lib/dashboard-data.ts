import {
  AlertTriangle,
  BarChart3,
  BookOpenText,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  Download,
  ExternalLink,
  FileText,
  Image,
  LayoutTemplate,
  Link2,
  ListChecks,
  Palette,
  PenLine,
  Radar,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Wand2
} from "lucide-react";

export type WorkspaceTab =
  | "dashboard"
  | "research"
  | "knowledge"
  | "content"
  | "cover"
  | "delivery"
  | "settings";

export const workspaceTabIds: WorkspaceTab[] = [
  "dashboard",
  "research",
  "knowledge",
  "content",
  "cover",
  "delivery",
  "settings"
];

export type InterfaceStyle =
  | "apple"
  | "mint"
  | "warm"
  | "graphite"
  | "cyberpunk"
  | "editorial"
  | "candy"
  | "ocean"
  | "brutalist";

export const interfaceStyles: Array<{
  id: InterfaceStyle;
  label: string;
  description: string;
}> = [
  {
    id: "apple",
    label: "苹果风",
    description: "灰白底、系统蓝、轻边框，适合日常高频使用。"
  },
  {
    id: "mint",
    label: "清爽绿",
    description: "延续 OPC 的知识库感，视觉更轻、更安静。"
  },
  {
    id: "warm",
    label: "柔和暖色",
    description: "更亲和，适合运营和推广场景。"
  },
  {
    id: "graphite",
    label: "夜间石墨",
    description: "深色磨砂、低眩光，适合夜间确认和长时间工作。"
  },
  {
    id: "cyberpunk",
    label: "赛博朋克",
    description: "深色霓虹、强科技感，适合趋势监控和实验模式。"
  },
  {
    id: "editorial",
    label: "杂志编辑",
    description: "纸张质感、暖白底，适合文案审稿和知识沉淀。"
  },
  {
    id: "candy",
    label: "甜感社媒",
    description: "轻粉和莓果色，更贴近小红书内容运营语境。"
  },
  {
    id: "ocean",
    label: "海盐蓝",
    description: "冷静、透明、低压力，适合采集和数据整理。"
  },
  {
    id: "brutalist",
    label: "粗野黑白",
    description: "高对比、强边界，适合快速排查问题和压力测试。"
  }
];

export const themeTemplates: Array<{
  description: string;
  label: string;
  style: InterfaceStyle;
}> = [
  {
    label: "日常运营",
    description: "默认工作台、汇总和交付",
    style: "apple"
  },
  {
    label: "知识沉淀",
    description: "资料归档、RAG、长期阅读",
    style: "editorial"
  },
  {
    label: "小红书推广",
    description: "偏女性、可爱、社媒运营",
    style: "candy"
  },
  {
    label: "趋势监控",
    description: "实验模式、科技感、采集看板",
    style: "cyberpunk"
  },
  {
    label: "夜间确认",
    description: "低亮度、少干扰、适合长时间检查",
    style: "graphite"
  },
  {
    label: "快速排障",
    description: "强对比、边界清楚、少装饰",
    style: "brutalist"
  }
];

export const tabThemeRecommendations: Record<
  WorkspaceTab,
  { reason: string; style: InterfaceStyle }
> = {
  dashboard: {
    reason: "日常总览保持清爽，少干扰。",
    style: "apple"
  },
  research: {
    reason: "公开采集和素材整理更适合低压力冷色。",
    style: "ocean"
  },
  knowledge: {
    reason: "长文阅读、归档和摘要更接近编辑台。",
    style: "editorial"
  },
  content: {
    reason: "小红书图文创作更贴近甜感社媒语境。",
    style: "candy"
  },
  cover: {
    reason: "封面方案需要更强的社媒停留感。",
    style: "candy"
  },
  delivery: {
    reason: "交付和推广协作更适合柔和暖色。",
    style: "warm"
  },
  settings: {
    reason: "配置页保持中性、稳定、易读。",
    style: "apple"
  }
};

export const navigation: Array<{
  id: WorkspaceTab;
  label: string;
  icon: typeof BarChart3;
}> = [
  { id: "dashboard", label: "指挥台", icon: BarChart3 },
  { id: "research", label: "趋势采集", icon: Radar },
  { id: "knowledge", label: "知识库", icon: BookOpenText },
  { id: "content", label: "内容生产", icon: PenLine },
  { id: "cover", label: "封面", icon: Image },
  { id: "delivery", label: "发布交付", icon: Users },
  { id: "settings", label: "设置", icon: Settings }
];

export const tabMeta: Record<WorkspaceTab, { title: string; description: string }> = {
  dashboard: {
    title: "内容运营指挥台",
    description: "只保留今日优先级、生产进度和必须处理的风险。"
  },
  research: {
    title: "趋势采集",
    description: "先看公开高赞图文，再沉淀写作参考和封面参考。"
  },
  knowledge: {
    title: "知识库",
    description: "管理趋势摘要、内部资料、写作参考和可检索资产。"
  },
  content: {
    title: "内容生产",
    description: "围绕知识库生成初稿、改写正文，并保留发布前人工确认边界。"
  },
  cover: {
    title: "封面工作台",
    description: "根据高赞图文风格生成封面方案，并人工复核标题准确性。"
  },
  delivery: {
    title: "发布交付",
    description: "管理已批准内容、导出包、发布记录和推广交接。"
  },
  settings: {
    title: "设置",
    description: "管理界面显示偏好；设置入口会始终保留。"
  }
};

export const stats = [
  { label: "趋势素材", value: "0", helper: "公开图文样本", tone: "steel" },
  { label: "知识条目", value: "0", helper: "可检索资产", tone: "moss" },
  { label: "待确认稿件", value: "0", helper: "发布前确认", tone: "coral" },
  { label: "可交付内容", value: "0", helper: "确认后交付", tone: "amber" }
] as const;

export const pipeline = [
  {
    title: "数据采集",
    state: "当前重点",
    description: "小红书/抖音公开图文、竞品样本和内部素材先入库。",
    icon: Database
  },
  {
    title: "知识沉淀",
    state: "可用",
    description: "确认后的趋势资产进入知识库，供检索和复用。",
    icon: BookOpenText
  },
  {
    title: "撰稿生成",
    state: "配置后可用",
    description: "完成设置后，撰稿服务读取知识库与写作参考，只生成可确认初稿。",
    icon: PenLine
  },
  {
    title: "人味化",
    state: "配置后可用",
    description: "完成设置后，改写服务压低模板感，保留关键词和事实边界。",
    icon: Sparkles
  },
  {
    title: "人工确认",
    state: "强制",
    description: "发布前必须经过人工确认和风险检查。",
    icon: ShieldCheck
  },
  {
    title: "封面与发布",
    state: "追踪",
    description: "图片服务生成素材，人工复核后交付发布。",
    icon: Send
  }
] as const;

export const commandFocus = [
  {
    title: "先补高赞图文参考",
    detail: "采集同类小红书图文，整理开头、标题、封面和评论触发点。",
    state: "今天重点",
    icon: Radar
  },
  {
    title: "把参考沉淀进知识库",
    detail: "保存来源摘要前必须人工确认，避免把不可靠样本写进资产库。",
    state: "门控",
    icon: BookOpenText
  },
  {
    title: "生成后先人工确认",
    detail: "初稿、改写、封面都不自动发布。",
    state: "强制",
    icon: ShieldCheck
  }
];

export const nextActions = [
  "测试图文采集任务能否稳定创建",
  "把高赞标题和封面风格整理成写作参考",
  "用参考生成一篇新草稿并人工确认"
];

export const queues = [
  { name: "采集任务", count: 0, owner: "运营", status: "待样本" },
  { name: "知识上传", count: 0, owner: "管理员", status: "等待" },
  { name: "草稿请求", count: 0, owner: "投放", status: "待创建" },
  { name: "确认清单", count: 0, owner: "负责人", status: "暂停" }
];

export const promoterActions = [
  {
    title: "已批准内容",
    description: "人工确认后进入推广交付池。",
    status: "0 条可交付",
    icon: CheckCircle2,
    command: "打开"
  },
  {
    title: "导出包",
    description: "Markdown、纯文本或 JSON 交付格式。",
    status: "确认门控",
    icon: Download,
    command: "导出"
  },
  {
    title: "发布记录",
    description: "记录平台、链接和发布状态。",
    status: "0 条记录",
    icon: FileText,
    command: "记录"
  }
];

export const publishingRecords = [
  {
    content: "暂无已发布内容",
    platform: "等待",
    owner: "投放",
    status: "空"
  },
  {
    content: "发布前必须人工批准",
    platform: "全部",
    owner: "运营",
    status: "门控"
  },
  {
    content: "确认后生成导出内容",
    platform: "多平台",
    owner: "工作台",
    status: "待批准"
  }
];

export const connectionStatuses = [
  {
    credentialKey: "draftApiKey",
    name: "撰稿服务",
    note: "设置页应用后用于生成初稿；前端不展示具体供应商和底层配置。",
    icon: PenLine
  },
  {
    credentialKey: "rewriteApiKey",
    name: "改写服务",
    note: "设置页应用后用于正文人味化和风格修正；仍需人工审阅。",
    icon: Wand2
  },
  {
    credentialKey: "imageApiKey",
    name: "图片服务",
    note: "设置页应用后用于封面素材生成；标题和文字必须二次复核。",
    icon: Image
  }
] as const;

export const draftPreview = {
  title: "硕升博申请第一步，不是先套磁",
  platform: "小红书图文",
  status: "待人工确认",
  body:
    "不是先套磁，先把问题想清楚。硕升博申请第一步，很多人一上来就急着问：要不要现在群发邮件？如果研究方向、读博动机和导师匹配还没想清楚，先发邮件反而容易浪费第一印象。",
  tags: ["硕升博", "博士申请", "研究方向", "申请规划"]
};

export const writingReferences = [
  {
    title: "开头先拆误区",
    source: "高赞图文参考",
    detail: "第一句话直接反常识：不是先做 A，而是先想清 B。读者会自然继续看原因。",
    icon: PenLine
  },
  {
    title: "正文用短段推进",
    source: "小红书风格",
    detail: "每段只解决一个判断，少用长解释，结尾给出可执行清单。",
    icon: ListChecks
  },
  {
    title: "评论区引导问题",
    source: "互动参考",
    detail: "把结尾设计成申请阶段自查问题，方便用户留言自己的情况。",
    icon: Users
  }
];

export const coverReferences = [
  {
    title: "大标题先给结论",
    detail: "封面只保留一个核心判断，避免信息堆满。",
    icon: LayoutTemplate
  },
  {
    title: "三点清单增强停留",
    detail: "用 1/2/3 列出读者能马上理解的步骤。",
    icon: ListChecks
  },
  {
    title: "底色要轻，标题要重",
    detail: "背景偏清爽，主标题黑色高对比，关键词用强调色。",
    icon: Palette
  }
];

export const knowledgeAssets = [
  {
    title: "高赞图文写作参考",
    status: "待采集",
    detail: "从公开图文里整理标题、开头、结构、评论触发点。",
    icon: Search
  },
  {
    title: "内部申请资料",
    status: "可上传",
    detail: "学校、项目、导师方向、成功案例和避坑经验。",
    icon: Upload
  },
  {
    title: "Prompt 模板库",
    status: "独立存放",
    detail: "撰稿、改写、封面提示词不写死在业务代码里。",
    icon: FileText
  },
  {
    title: "来源链接归档",
    status: "必填",
    detail: "保存知识摘要时保留公开链接和人工确认状态。",
    icon: Link2
  }
];

export const contentControls = [
  {
    title: "选题输入",
    detail: "选择平台、关键词、目标人群和参考知识条目。",
    icon: PenLine
  },
  {
    title: "正文改写",
    detail: "压掉模板味，保留关键词和事实边界。",
    icon: Wand2
  },
  {
    title: "人工确认",
    detail: "生成结果不会自动发布，确认流程后续再接入。",
    icon: ShieldCheck
  }
];

export const imageWorkflow = [
  {
    title: "封面 brief",
    detail: "从标题、三点清单和风格参考生成图片需求。",
    status: "可准备",
    icon: LayoutTemplate
  },
  {
    title: "生成素材",
    detail: "图片服务只负责出图，不直接发布。",
    status: "待触发",
    icon: Image
  },
  {
    title: "人工复核",
    detail: "检查文字、事实、平台适配和是否需要重新出图。",
    status: "强制",
    icon: ClipboardCheck
  }
];

export const reviewQueue = [
  { title: "硕升博申请顺序", source: "撰稿与改写服务", status: "待确认", icon: ClipboardCheck },
  { title: "封面标题准确性", source: "图片生成服务", status: "需复核", icon: LayoutTemplate },
  { title: "高赞样本参考", source: "公开来源确认", status: "待采集", icon: ExternalLink }
];

export const safetyGates = [
  { label: "采集先于生成", state: "启用", icon: Database },
  { label: "Prompt 独立存放", state: "启用", icon: FileText },
  { label: "发布需人工确认", state: "强制", icon: ShieldCheck },
  { label: "图片标题需复核", state: "提醒", icon: AlertTriangle }
];

export const timeline = [
  { label: "采集公开样本", helper: "先看真实内容", icon: Radar },
  { label: "保存知识摘要", helper: "人工确认来源", icon: BookOpenText },
  { label: "生成并确认", helper: "不自动发布", icon: Clock3 }
];
