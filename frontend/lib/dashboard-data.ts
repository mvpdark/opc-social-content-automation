import {
  AlertTriangle,
  BarChart3,
  BookOpenText,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  ExternalLink,
  FileText,
  Image,
  KeyRound,
  LayoutTemplate,
  PenLine,
  Radar,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";

export const navigation = [
  { label: "指挥台", icon: BarChart3, active: true },
  { label: "趋势采集", icon: Radar },
  { label: "知识库", icon: BookOpenText },
  { label: "内容生产", icon: PenLine },
  { label: "审核", icon: ClipboardCheck },
  { label: "封面", icon: Image },
  { label: "发布交付", icon: Users }
];

export const stats = [
  { label: "趋势素材", value: "0", helper: "公开图文样本", tone: "steel" },
  { label: "知识条目", value: "0", helper: "可检索资产", tone: "moss" },
  { label: "待审稿件", value: "0", helper: "人工审核前", tone: "coral" },
  { label: "可交付内容", value: "0", helper: "批准后发布", tone: "ink" }
];

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
    description: "审核后的趋势资产进入知识库，供 RAG 检索。",
    icon: BookOpenText
  },
  {
    title: "撰稿生成",
    state: "已接入",
    description: "GPT-5.5 通过 Model Router 生成初稿。",
    icon: PenLine
  },
  {
    title: "人味化",
    state: "已接入",
    description: "DeepSeek 4 Pro 改写正文，保留赛道关键词。",
    icon: Sparkles
  },
  {
    title: "人工审核",
    state: "强制",
    description: "发布前必须经过人工审核和风险确认。",
    icon: ShieldCheck
  },
  {
    title: "封面与发布",
    state: "追踪",
    description: "gpt-image-2 出图，Canva/发布记录跟踪交付。",
    icon: Send
  }
];

export const queues = [
  { name: "采集任务", count: 0, owner: "运营", status: "待样本" },
  { name: "知识上传", count: 0, owner: "管理员", status: "等待" },
  { name: "草稿请求", count: 0, owner: "投放", status: "待创建" },
  { name: "审核队列", count: 0, owner: "负责人", status: "锁定" }
];

export const promoterActions = [
  {
    title: "已批准内容",
    description: "人工审核后进入推广交付池。",
    status: "0 条就绪",
    icon: CheckCircle2,
    command: "打开"
  },
  {
    title: "导出包",
    description: "Markdown、纯文本或 JSON 交付格式。",
    status: "审核门控",
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
    content: "批准后生成导出内容",
    platform: "多平台",
    owner: "工作台",
    status: "就绪"
  }
];

export const providerStatuses = [
  {
    name: "Draft generation",
    provider: "openai_compatible",
    model: "gpt-5.5",
    status: "Connected",
    note: "撰稿中转站已完成 smoke test。",
    icon: PenLine
  },
  {
    name: "Humanization rewrite",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    status: "Connected",
    note: "DeepSeek 官方 API 已完成 rewrite smoke test。",
    icon: KeyRound
  },
  {
    name: "Image generation",
    provider: "openai_compatible",
    model: "gpt-image-2",
    status: "Connected",
    note: "gpt-image-2 已完成真实图片 smoke test。",
    icon: Image
  }
];

export const draftPreview = {
  title: "硕升博申请第一步，不是先套磁",
  platform: "小红书图文",
  status: "待人工审核",
  body:
    "不是先套磁，先把问题想清楚。硕升博申请第一步，很多人一上来就急着问：要不要现在群发邮件？如果研究方向、读博动机和导师匹配还没想清楚，先发邮件反而容易浪费第一印象。",
  tags: ["硕升博", "博士申请", "研究方向", "申请规划"]
};

export const reviewQueue = [
  { title: "硕升博申请顺序", source: "GPT-5.5 + DeepSeek", status: "待审", icon: ClipboardCheck },
  { title: "封面标题准确性", source: "gpt-image-2", status: "需复核", icon: LayoutTemplate },
  { title: "高赞样本参考", source: "小红书登录态", status: "待采集", icon: ExternalLink }
];

export const safetyGates = [
  { label: "采集先于生成", state: "启用", icon: Database },
  { label: "Prompt 独立存放", state: "启用", icon: FileText },
  { label: "发布需人工审核", state: "强制", icon: ShieldCheck },
  { label: "图片标题需复核", state: "提醒", icon: AlertTriangle }
];

export const modelRouterChecks = [
  { label: "GPT-5.5 撰稿", state: "Connected", icon: Brain },
  { label: "DeepSeek 4 Pro", state: "Connected", icon: RefreshCcw },
  { label: "gpt-image-2", state: "Connected", icon: Image }
];
