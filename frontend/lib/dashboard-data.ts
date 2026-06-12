import {
  AlertTriangle,
  BarChart3,
  BookOpenText,
  CheckCircle2,
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
    description: "资料归档、智能检索、长期阅读",
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
  { id: "content", label: "一键生成", icon: PenLine },
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
    title: "一键生成",
    description: "围绕知识库一键生成文案和封面，并保留发布前人工确认边界。"
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
    title: "自然润色",
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

export const dashboardActionLinks = [
  {
    title: "补高赞图文参考",
    detail: "先采集公开图文和标题结构。",
    href: "/?tab=research",
    command: "去采集",
    status: "当前重点",
    icon: Radar
  },
  {
    title: "沉淀写作参考",
    detail: "把确认过的样本整理进知识库。",
    href: "/?tab=knowledge",
    command: "去知识库",
    status: "待补充",
    icon: BookOpenText
  },
  {
    title: "一键生成营销图文",
    detail: "进入一键生成页创建文案和封面。",
    href: "/?tab=content",
    command: "去生成",
    status: "可开始",
    icon: PenLine
  }
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
    note: "设置页应用后用于正文自然润色和风格修正；仍需人工审阅。",
    icon: Wand2
  },
  {
    credentialKey: "imageApiKey",
    name: "图片服务",
    note: "设置页应用后用于封面素材生成；标题和文字必须二次复核。",
    icon: Image
  }
] as const;

export const externalSkillCandidates = [
  {
    title: "XiaohongshuSkills",
    source: "white0dew/XiaohongshuSkills",
    href: "https://github.com/white0dew/XiaohongshuSkills",
    module: "采集 / 发布流程参考",
    status: "优先试点",
    license: "MIT",
    summary: "支持检索、详情、发布和评论相关 Skill，适合拆出只读搜索与发布前填充流程。",
    guardrail: "需要真实登录态和网页选择器；默认只接只读检索，发布仍需人工确认。",
    icon: Search
  },
  {
    title: "Guizang Social Card Skill",
    source: "op7418/guizang-social-card-skill",
    href: "https://github.com/op7418/guizang-social-card-skill",
    module: "小红书组图 / 封面",
    status: "可选外部调用",
    license: "AGPL-3.0",
    summary: "提供 1080x1440 小红书卡片、版式骨架、主题和 Playwright 渲染 PNG。",
    guardrail: "AGPL 不直接复制进闭源产品；可作为外部工具或视觉参考。",
    icon: LayoutTemplate
  },
  {
    title: "xhs-cover-skill",
    source: "Vivixiao980/xhs-cover-skill",
    href: "https://github.com/Vivixiao980/xhs-cover-skill",
    module: "封面生成",
    status: "优先试点",
    license: "需确认",
    summary: "小红书封面能力包，覆盖多种风格，贴近当前封面工作台。",
    guardrail: "先确认许可证和生成素材归属，再决定是否接入为可选能力。",
    icon: Image
  },
  {
    title: "xiaohongshu-ops-skill",
    source: "Xiangyu-CAS/xiaohongshu-ops-skill",
    href: "https://github.com/Xiangyu-CAS/xiaohongshu-ops-skill",
    module: "选题 / 知识库 / 复盘",
    status: "可选接入",
    license: "需确认",
    summary: "包含推荐流分析、账号分析、选题灵感、知识库和爆款复刻思路。",
    guardrail: "自动发布和自动回复不默认启用，只吸收分析与知识沉淀流程。",
    icon: Radar
  },
  {
    title: "XHS-Downloader",
    source: "JoeanAmier/XHS-Downloader",
    href: "https://github.com/JoeanAmier/XHS-Downloader",
    module: "链接解析 / 素材归档",
    status: "只做外部工具",
    license: "GPL-3.0",
    summary: "成熟的作品信息、图片和视频下载工具，适合用户主动提供链接后的资料归档。",
    guardrail: "GPL 项目不复制实现；只可作为独立进程、可选工具或接口设计参考。",
    icon: Download
  },
  {
    title: "SocialDataX 小红书情报服务",
    source: "devinchen2014/xiaohongshu-xhs-rednote-mcp",
    href: "https://github.com/devinchen2014/xiaohongshu-xhs-rednote-mcp",
    module: "只读社媒情报",
    status: "候选服务",
    license: "MIT 文档 / 托管服务",
    summary: "托管检索服务，支持搜索、热榜、笔记详情、评论和博主信息，适合低频只读调研。",
    guardrail: "需要第三方服务密钥；接入前确认数据来源、费用和隐私条款。",
    icon: ShieldCheck
  },
  {
    title: "RedNote 小红书检索服务",
    source: "MilesCool/rednote-mcp",
    href: "https://github.com/MilesCool/rednote-mcp",
    module: "只读检索 / 竞品素材",
    status: "优先试点",
    license: "MIT",
    summary: "小红书搜索与内容提取工具，返回标题、正文、作者、互动数、图片和标签。",
    guardrail: "首次需要人工登录；只接只读搜索和详情抽取，不允许默认评论、点赞或发布。",
    icon: Search
  },
  {
    title: "xiaohongshu-text-image",
    source: "buptweixin/xiaohongshu_skills",
    href: "https://github.com/buptweixin/xiaohongshu_skills",
    module: "封面 / 轮播卡片",
    status: "可选接入",
    license: "需确认",
    summary: "面向小红书封面、标题卡、轮播页和 CTA 卡的文本图生成 Skill，输出 SVG/PNG/JPG。",
    guardrail: "PNG/JPG 依赖 macOS Swift；Windows 安装包阶段优先借鉴 JSON 规格和 SVG 渲染思路。",
    icon: LayoutTemplate
  },
  {
    title: "xhs-cover-mcp",
    source: "xwchris/xhs-cover-mcp",
    href: "https://github.com/xwchris/xhs-cover-mcp",
    module: "封面候选服务",
    status: "候选服务",
    license: "需确认",
    summary: "小红书封面生成器，可用外部命令启动，适合做封面工作台的外部渲染器候选。",
    guardrail: "先确认许可证、字体素材、图片输出归属和 Windows 打包方式；不要替代人工复核。",
    icon: Image
  },
  {
    title: "xhs-skill",
    source: "leeguooooo/xhs-skill",
    href: "https://github.com/leeguooooo/xhs-skill",
    module: "发布门禁 / 登录流程参考",
    status: "只做外部工具",
    license: "MIT",
    summary: "强调二维码登录、登录状态整理、发布前门禁校验和内容审核，适合参考发布安全链路。",
    guardrail: "当前不接自动发布；只吸收发布内容校验、真实话题池、发布前人工确认等门禁设计。",
    icon: ShieldCheck
  },
  {
    title: "139 Xiaohongshu Skills",
    source: "vivy-yi/xiaohongshu-skills",
    href: "https://github.com/vivy-yi/xiaohongshu-skills",
    module: "运营技能库参考",
    status: "可选接入",
    license: "需确认",
    summary: "覆盖内容创作、账号运营、互动运营、数据分析、电商转化、规则、工具生态和增长策略。",
    guardrail: "先当运营知识目录和写作结构参考；逐项确认质量与许可证后再拆分接入。",
    icon: BookOpenText
  },
  {
    title: "技能发现工具",
    source: "vercel-labs/skills",
    href: "https://github.com/vercel-labs/skills",
    module: "技能发现 / 安装工具",
    status: "可选外部调用",
    license: "需确认",
    summary: "开放的 AI 能力包安装与使用工具，支持常见 AI 工作环境。",
    guardrail: "只用于列出和拉取候选能力包；接入前仍需人工审查来源、许可证和脚本权限。",
    icon: Sparkles
  }
] as const;

export const draftPreview = {
  title: "硕升博申请第一步，不是先套磁",
  platform: "小红书图文",
  status: "待人工确认",
  body:
    "不是先套磁，先把问题想清楚。[笑哭R]\n\n硕升博申请第一步，很多人一上来就急着问：要不要现在群发邮件？如果研究方向、读博动机和导师匹配还没想清楚，先发邮件反而容易浪费第一印象。[汗颜R]\n\n先把 3 件事写下来：\n1. 你想研究的问题到底是什么，不要只写一个很大的方向。\n2. 这个问题为什么值得继续读博，和你过去的经历有什么关系。\n3. 你要找的导师，是不是刚好在做相近项目，而不是只看学校排名。[赞R]\n\n套磁邮件不是越早越好，而是越清楚越好。你发出去的第一封邮件，其实是在告诉导师：你是否已经具备初步的研究判断。\n\n所以别急着群发，先把研究方向、动机和匹配理由整理成一页纸。等这页纸能说清楚，再去写邮件，成功率和回复质量都会更稳一点。[doge]",
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
    title: "写作模板库",
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
    title: "封面需求",
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
    icon: ShieldCheck
  }
];

export const safetyGates = [
  { label: "采集先于生成", state: "启用", icon: Database },
  { label: "写作模板独立存放", state: "启用", icon: FileText },
  { label: "发布需人工确认", state: "强制", icon: ShieldCheck },
  { label: "图片标题需复核", state: "提醒", icon: AlertTriangle }
];

export const timeline = [
  { label: "采集公开样本", helper: "先看真实内容", icon: Radar },
  { label: "保存知识摘要", helper: "人工确认来源", icon: BookOpenText },
  { label: "生成并确认", helper: "不自动发布", icon: Clock3 }
];
