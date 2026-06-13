export type GenerationTopicPresetKey = "ranking" | "route" | "mentor" | "timeline" | "sales";

export type GenerationTopicPreset = {
  audience: string;
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
