export type GenerationTopicPresetKey = "ranking" | "route" | "mentor" | "timeline" | "sales";

export type GenerationTopicPreset = {
  audience: string;
  coverDirection: string;
  desktopHelper: string;
  desktopLabel: string;
  key: GenerationTopicPresetKey;
  knowledgeQuery: string;
  mobileHelper: string;
  mobileLabel: string;
  tags: string;
  topic: string;
};

export const generationTopicPresets: GenerationTopicPreset[] = [
  {
    audience: "想快速筛选海外博士路线的在职申请人",
    coverDirection:
      "使用榜单矩阵或排名分层表，突出认证优先、预算友好、在职适配等维度，不使用未经核实的校徽、官方标志或录取承诺。",
    desktopHelper: "按榜单、认证、预算和在职友好度展开",
    desktopLabel: "榜单型",
    key: "ranking",
    knowledgeQuery: "全球 水博 博士 项目 排名 认证 预算 在职",
    mobileHelper: "榜单/排名",
    mobileLabel: "榜单",
    tags: "水博,海外博士,在职博士,博士项目,小红书获客",
    topic: "全球水博排名必看"
  },
  {
    audience: "准备硕升博但不知道选国内还是海外的学生",
    coverDirection:
      "使用路线决策地图或分叉路径图，突出国内/海外/在职路线对比和选择条件，避免做成导师匹配或时间表。",
    desktopHelper: "按选择路径和判断条件展开",
    desktopLabel: "路线型",
    key: "route",
    knowledgeQuery: "硕升博 申请路线 国内 海外 在职博士",
    mobileHelper: "路线判断",
    mobileLabel: "路线",
    tags: "硕升博,博士申请,路线规划,在职博士",
    topic: "硕升博申请路线怎么选"
  },
  {
    audience: "已经有研究兴趣但不知道怎么找导师的申请人",
    coverDirection:
      "使用导师匹配雷达、自查清单或研究方向卡片，突出方向适配、论文项目、经历接合度，不做榜单排名。",
    desktopHelper: "围绕方向自查和导师匹配动作",
    desktopLabel: "导师型",
    key: "mentor",
    knowledgeQuery: "博士申请 导师匹配 研究方向 套磁",
    mobileHelper: "导师匹配",
    mobileLabel: "导师",
    tags: "导师匹配,研究方向,博士申请,套磁",
    topic: "导师匹配前要做的方向自查"
  },
  {
    audience: "准备一年内启动博士申请的在职人群",
    coverDirection:
      "使用时间轴、日历节点或材料排期表，突出月份节点、材料准备和沟通节奏，不做学校排名。",
    desktopHelper: "围绕时间表、材料和节点",
    desktopLabel: "时间型",
    key: "timeline",
    knowledgeQuery: "在职博士 申请时间线 材料准备 节点",
    mobileHelper: "时间节点",
    mobileLabel: "时间",
    tags: "在职博士,申请时间线,材料准备,硕升博",
    topic: "在职博士申请时间线怎么排"
  },
  {
    audience: "想先了解项目适配度再咨询的潜在客户",
    coverDirection:
      "使用咨询转化漏斗、私域SOP卡片或低压行动清单，突出先判断适配度再咨询，不制造焦虑或承诺结果。",
    desktopHelper: "围绕咨询转化和低压行动建议",
    desktopLabel: "转化型",
    key: "sales",
    knowledgeQuery: "博士项目 咨询 转化 私域 小红书",
    mobileHelper: "咨询转化",
    mobileLabel: "转化",
    tags: "博士项目,咨询转化,私域运营,小红书营销",
    topic: "适合上班族的博士项目怎么咨询"
  }
];

export function findGenerationTopicPresetByTopic(topic: string) {
  const normalizedTopic = topic.trim();
  return (
    generationTopicPresets.find((preset) => preset.topic === normalizedTopic) ?? null
  );
}

export function buildTopicCoverStyleNotes(baseStyleNotes: string, topic: string) {
  const preset = findGenerationTopicPresetByTopic(topic);
  if (!preset) {
    return baseStyleNotes;
  }
  return `${baseStyleNotes} 当前选题封面方向：${preset.coverDirection}`;
}
