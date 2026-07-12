import { memo } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { MobileOverlayPortal, MobilePanel } from "@/components/mobile-ui";
import { renderXhsExpressionText } from "@/lib/xhs-stickers";

export const sampleReferences = [
  {
    body:
      "姐妹们，硕升博别一上来就套磁。[哭惹R]\n\n先确认研究方向、导师项目和自己的材料匹配度，再去写邮件，第一印象会稳很多。\n\n真正要先做的是：把方向拆清楚，把导师近期成果读一遍，把你能贡献什么写成一句话。",
    coverNotes: ["路线矩阵", "决策地图", "封面轮换"],
    cue: "反常识开头 + 路线结构",
    meta: "结构模板 · 参考版式",
    takeaways: ["先打断常见误区", "再给 3 个动作", "结尾给温和提醒"],
    title: "不是先套磁，先确认这 3 件事"
  },
  {
    body:
      "宝子，群发邮件真的不是越早越好～\n\n如果方向没拆清楚，邮件看起来就会像模板，导师也很难判断你到底适不适合他的组。\n\n先做一个小动作：把每位导师的研究主题、近两年成果、你能接上的经历放在同一张表里。",
    coverNotes: ["误区提醒", "邮件场景", "行动表格"],
    cue: "先打断误区，再给动作",
    meta: "结构模板 · 参考版式",
    takeaways: ["用场景切入", "指出群发风险", "给出表格化动作"],
    title: "硕升博申请别急着群发邮件"
  },
  {
    body:
      "导师匹配前，先做一次方向自查！！[赞R]\n\n不是看导师名气有多大，而是看你的经历、兴趣和他正在做的项目能不能接上。\n\n可以从三个问题开始：我能研究什么？我已经做过什么？我为什么适合这个方向？",
    coverNotes: ["步骤化封面", "方向自查", "清爽正文"],
    cue: "步骤化封面 + 低噪正文",
    meta: "封面模板 · 参考版式",
    takeaways: ["问题式开头", "降低焦虑", "强调匹配逻辑"],
    title: "导师匹配前要做的方向自查"
  }
] as const;

export type SampleReference = (typeof sampleReferences)[number];

export const MobileReferenceTemplateList = memo(function MobileReferenceTemplateList({
  onPreview,
  selectedTitle
}: {
  onPreview: (reference: SampleReference) => void;
  selectedTitle: string;
}) {
  return (
    <MobilePanel title="结构模板">
      <div className="space-y-3">
        {sampleReferences.map((item, index) => (
          <button
            aria-pressed={selectedTitle === item.title}
            key={`sample-reference-${index}-${item.title}`}
            className={[
              "block w-full touch-manipulation rounded-[22px] border bg-white p-3 text-left active:scale-[0.99]",
              selectedTitle === item.title ? "border-moss ring-2 ring-moss/[0.15]" : "border-sage"
            ].join(" ")}
            data-testid={`reference-${index}`}
            onClick={() => onPreview(item)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-5">{item.title}</h3>
                <p className="mt-1 text-xs text-muted">{item.meta}</p>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 text-muted" />
            </div>
            <div className="mt-3 rounded-md bg-amber/10 px-3 py-2 text-xs font-medium text-amber-ink">
              {item.cue}
            </div>
          </button>
        ))}
      </div>
    </MobilePanel>
  );
});

export const ReferencePreviewSheet = memo(function ReferencePreviewSheet({
  onClose,
  reference
}: {
  onClose: () => void;
  reference: SampleReference;
}) {
  return (
    <MobileOverlayPortal>
      <div
        aria-modal="true"
        className="fixed inset-0 z-[80] flex justify-center bg-white"
        data-testid="reference-preview"
        role="dialog"
      >
        <div className="flex h-[100dvh] w-full max-w-[430px] flex-col bg-sage text-ink">
          <header className="shrink-0 border-b border-sage bg-white px-4 pb-3 pt-3">
            <div className="flex items-center justify-between gap-3">
              <button
                aria-label="关闭参考预览"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink"
                data-testid="reference-preview-close"
                onClick={onClose}
                type="button"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-moss">结构模板</div>
                <h2 className="truncate text-lg font-semibold leading-6">参考预览</h2>
              </div>
              <span className="rounded-full bg-amber/10 px-3 py-1 text-[11px] font-semibold text-amber-ink">
                待确认
              </span>
            </div>
          </header>

          <section className="min-h-0 flex-1 overflow-y-auto pb-[calc(24px+env(safe-area-inset-bottom))]">
            <div className="bg-[linear-gradient(160deg,rgb(var(--cream)),rgb(var(--sage))_52%,rgb(var(--blush)))] px-5 pb-8 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-steel">封面结构</span>
                <span className="rounded-full bg-white/[0.75] px-3 py-1 text-[11px] font-semibold text-ink/[0.70]">
                  参考
                </span>
              </div>
              <h1 className="mt-10 text-[32px] font-black leading-tight text-ink">{reference.title}</h1>
              <div className="mt-8 space-y-2 text-xs font-semibold text-ink/[0.70]">
                {reference.coverNotes.map((note, index) => (
                  <div
                    className="rounded-md bg-white/[0.85] px-3 py-2"
                    key={`cover-note-${index}-${note}`}
                  >
                    {index + 1}. {note}
                  </div>
                ))}
              </div>
            </div>

            <article className="bg-white px-4 pb-6 pt-4">
              <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
                <div className="min-w-0">
                  <h3 className="text-base font-bold leading-6">{reference.title}</h3>
                  <p className="mt-1 text-xs text-muted">{reference.meta}</p>
                </div>
              </div>

              <div className="mt-4 rounded-md bg-amber/10 px-3 py-2 text-xs font-semibold text-amber-ink">
                {reference.cue}
              </div>

              <div className="mt-4 space-y-3 text-[15px] leading-7 text-ink">
                {reference.body.split(/\n+/).map((paragraph, index) => (
                  <p key={`${index}-${paragraph}`}>{renderXhsExpressionText(paragraph)}</p>
                ))}
              </div>

              <div className="mt-6 border-t border-line pt-4">
                <div className="text-xs font-semibold text-muted">可借鉴点</div>
                <div className="mt-3 space-y-2">
                  {reference.takeaways.map((takeaway, index) => (
                    <div
                      className="flex gap-3 rounded-md border border-sage bg-sage px-3 py-2 text-sm font-medium"
                      key={`takeaway-${index}-${takeaway}`}
                    >
                      <span className="text-moss">{index + 1}</span>
                      <span>{takeaway}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-md border border-sage bg-sage px-3 py-2 text-xs leading-5 text-muted">
                这是参考预览，不是自动发布内容；真实采集来源仍需要人工确认。
              </div>
            </article>
          </section>
        </div>
      </div>
    </MobileOverlayPortal>
  );
});
