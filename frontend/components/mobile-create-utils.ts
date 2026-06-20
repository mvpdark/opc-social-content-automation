import { buildTopicCoverStyleNotes } from "@/lib/topic-presets";
import { formatTagLine } from "@/lib/tags";
import type { DraftPreviewState } from "@/lib/mobile-draft-storage";
import type { GeneratedContent } from "@/lib/generated-assets";
import type { MobilePlatform } from "@/lib/mobile-runtime";

export const MOBILE_COVER_HYDRATION_RETRY_LIMIT = 10;
export const MOBILE_COVER_HYDRATION_RETRY_MS = 3000;
export const MOBILE_CREATE_CARD_BG = "/mobile-assets/create-card-bg.png";

export const MOBILE_GENERATE_KNOWLEDGE_LIMIT = 5;
export const MOBILE_GENERATE_PROGRESS_INTERVAL_MS = 700;
export const MOBILE_GENERATE_PROGRESS_INITIAL_PERCENT = 3;
export const MOBILE_GENERATE_PROGRESS_DEFAULT_CEILING = 62;
export const MOBILE_GENERATE_PROGRESS_STAGE_FLOOR = 68;
export const MOBILE_GENERATE_PROGRESS_STAGE_CEILING = 94;
export const MOBILE_COVER_HYDRATION_BATCH_SIZE = 20;
export const MOBILE_COMPLETION_VIBRATION_PATTERN = [80, 40, 80];

export const defaultMobileDraftPreview: DraftPreviewState = {
  body:
    "很多人一上来就急着群发邮件，但研究方向、读博动机和导师匹配没想清楚，反而容易浪费第一印象。",
  points: ["明确研究方向", "匹配导师项目", "再定制套磁"],
  tags: "#硕升博 #博士申请 #研究方向",
  title: "不是先套磁，先想清楚这 3 件事"
};

export const xhsMobileDraftTone = [
  "小红书女性向图文风格，像学姐认真提醒，温柔、轻松、真实、有陪伴感，不要像官方说明文",
  "开头必须有共鸣和反常识冲突，前三行要有停留感",
  "正文必须把 emoji 当成结构标识使用，不是随便撒表情：👉💧 用于开头钩子，👇 用于引出分类，📍 用于路线小节，🔥 用于优点/条件模块，✅ 用于卖点清单，🎓 用于专业池，😎 用于问答判断段，💓 用于申请条件或温柔引导",
  "路线/榜单/资料型图文必须出现 5-9 个结构 emoji，并保持每 2-4 段就有一个视觉锚点",
  "可以额外自然加入 1-3 个小红书表情字符码或轻量颜文字，优先 [笑哭R]、[哭惹R]、[哇R]、[赞R]、[doge]、[蹲后续H]，但不能只靠表情字符码代替结构 emoji",
  "允许使用 ～、！！、？、…… 和短括号吐槽制造口语节奏与表情包感，例如（先别急）（真的别反着来）（会很亏）",
  "自然提高口语语气词密度，在开头、转折和提醒处穿插哦、哟、呀、啊、嘛、呢、啦、哈等，但不要每句都堆",
  "可以少量使用姐妹、宝子、uu、学妹等女性向社媒称呼，但保持专业可信",
  "结尾用温柔提醒或轻引导，不制造焦虑，不承诺录取或导师回复结果"
].join("；");

export const shortPostDraftTone =
  "短段正文风格，表达克制、清楚、有行动建议，不制造录取承诺。";

export const defaultMobileTargetAudience = "准备硕升博申请的学生";
export const defaultMobileTagsText = "硕升博,水博,博士申请,小红书获客";

export function draftStateFromContent(content: GeneratedContent): DraftPreviewState {
  return {
    body: content.body,
    points: ["明确研究方向", "匹配导师项目", "再定制套磁"],
    tags: formatTagLine(content.tags),
    title: content.title
  };
}

export function buildMobileCoverStyleNotes(platform: MobilePlatform, topic: string): string {
  const isDouyinPost = platform === "douyin";
  const baseCoverStyleNotes = isDouyinPost
    ? "抖音图文封面，强标题、高对比、真实学习/申请材料场景，避免录取承诺。"
    : "小红书高吸引封面，按选题轮换路线矩阵、决策地图、学术蓝图、杂志页、黑板批注或手机信息拼贴；水博/在职博士类可用榜单矩阵，但学校和项目细节必须来自已核实知识库，避免录取承诺。";
  return buildTopicCoverStyleNotes(baseCoverStyleNotes, topic);
}

export function buildMobileCoverImageRequestPayload(
  platform: MobilePlatform,
  contentId: number,
  styleNotes: string
): {
  aspect_ratio: string;
  content_id: number;
  style_notes: string;
  template: string;
} {
  const isDouyinPost = platform === "douyin";
  return {
    aspect_ratio: isDouyinPost ? "9:16" : "3:4",
    content_id: contentId,
    style_notes: styleNotes,
    template: isDouyinPost ? "douyin-cover" : "xiaohongshu-cover"
  };
}

export function buildMobileCompletionNotificationOptions(
  platform: MobilePlatform,
  contentId: number
): { title: string; options: NotificationOptions } {
  return {
    title: "一键生成完成",
    options: {
      body: "文案和封面图已生成。",
      icon: platform === "douyin" ? "/platform-icons/douyin.ico" : "/platform-icons/xiaohongshu.ico",
      tag: `opc-mobile-generation-${contentId}`
    }
  };
}

export function buildStaleMobileDraftMessage(
  generatedContent: GeneratedContent | null,
  matchesCurrentInputs: boolean,
  topic: string
): string | null {
  if (!generatedContent || matchesCurrentInputs) {
    return null;
  }
  const trimmedTopic = topic.trim();
  return generatedContent.title === trimmedTopic
    ? "当前草稿的检索依据或标签已不是当前输入，复制前请重新生成。"
    : `当前已打开草稿是“${generatedContent.title}”，不是当前选题“${trimmedTopic}”，复制前请重新生成。`;
}

export function buildMobileHeroProgressState(
  busy: boolean,
  progressPercent: number,
  progressLabel: string,
  matchesCurrentInputs: boolean
): { percent: number; label: string; value: string } {
  if (busy) {
    return {
      percent: progressPercent,
      label: progressLabel,
      value: `${progressPercent}%`
    };
  }
  if (matchesCurrentInputs) {
    return {
      percent: 100,
      label: "草稿和封面可继续编辑",
      value: "已就绪"
    };
  }
  return {
    percent: 0,
    label: "点击下方按钮开始生成",
    value: "未开始"
  };
}

export function computeMobileProgressStep(currentPercent: number): number {
  if (currentPercent < 30) {
    return 4;
  }
  if (currentPercent < 65) {
    return 3;
  }
  return 1;
}
