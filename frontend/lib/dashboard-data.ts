import {
  BarChart3,
  BookOpenText,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  FileText,
  Image,
  KeyRound,
  PenLine,
  Radar,
  Send,
  ShieldCheck,
  Users
} from "lucide-react";

export const navigation = [
  { label: "Dashboard", icon: BarChart3, active: true },
  { label: "Trends", icon: Radar },
  { label: "Knowledge", icon: BookOpenText },
  { label: "Content", icon: PenLine },
  { label: "Review", icon: ClipboardCheck },
  { label: "Images", icon: Image },
  { label: "Promoters", icon: Users }
];

export const stats = [
  { label: "Trend assets", value: "0", tone: "steel" },
  { label: "Knowledge items", value: "0", tone: "moss" },
  { label: "Approved content", value: "0", tone: "coral" },
  { label: "Publish records", value: "0", tone: "ink" }
];

export const pipeline = [
  {
    title: "Data collection",
    state: "Foundation",
    description: "Xiaohongshu, Douyin, competitor, and internal account assets.",
    icon: Database
  },
  {
    title: "Knowledge base",
    state: "Next",
    description: "pgvector-backed retrieval before generation.",
    icon: BookOpenText
  },
  {
    title: "Content generation",
    state: "Planned",
    description: "GPT draft generation through Model Router.",
    icon: PenLine
  },
  {
    title: "Human review",
    state: "Required",
    description: "No publishing path bypasses manual approval.",
    icon: ShieldCheck
  },
  {
    title: "Publishing",
    state: "Tracked",
    description: "Promoter export and publish record workflow.",
    icon: Send
  }
];

export const queues = [
  { name: "Collection jobs", count: 0, owner: "Ops", status: "Setup" },
  { name: "Knowledge uploads", count: 0, owner: "Admin", status: "Waiting" },
  { name: "Draft requests", count: 0, owner: "Promoter", status: "Waiting" },
  { name: "Review queue", count: 0, owner: "Ops", status: "Locked" }
];

export const promoterActions = [
  {
    title: "Approved content",
    description: "Ready for handoff after human review.",
    status: "0 ready",
    icon: CheckCircle2,
    command: "Open"
  },
  {
    title: "Export package",
    description: "Markdown, plain text, or JSON payload.",
    status: "Approval gated",
    icon: Download,
    command: "Export"
  },
  {
    title: "Publish record",
    description: "Track platform, link, and publish state.",
    status: "0 tracked",
    icon: FileText,
    command: "Record"
  }
];

export const publishingRecords = [
  {
    content: "No published content yet",
    platform: "Waiting",
    owner: "Promoter",
    status: "Empty"
  },
  {
    content: "Human approval required",
    platform: "All",
    owner: "Ops",
    status: "Gate"
  },
  {
    content: "Export payloads ready after approval",
    platform: "Multi",
    owner: "Workspace",
    status: "Ready"
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
