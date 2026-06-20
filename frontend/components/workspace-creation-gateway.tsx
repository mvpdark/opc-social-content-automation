"use client";

import {
  BookOpenText,
  Clipboard,
  Image,
  Loader2,
  PenLine,
  Search,
  ShieldCheck
} from "lucide-react";
import { type GeneratedContent } from "@/lib/generated-assets";
import {
  creationProjects,
  type CreationProjectId
} from "./workspace-utils";
import { IconBox, Pill } from "./workspace-ui";

export function CreationProjectGateway({
  latestContent,
  loading,
  onSelect
}: {
  latestContent: GeneratedContent | null;
  loading: boolean;
  onSelect: (projectId: CreationProjectId) => void;
}) {
  const liveProject = creationProjects.find((project) => project.enabled) ?? creationProjects[0];
  const roadmapProjects = creationProjects.filter((project) => !project.enabled);
  const gatewayWorkflowIcons = [Search, PenLine, Clipboard, ShieldCheck] as const;
  const gatewayWorkflowTones = ["blue", "green", "amber", "red"] as const;

  return (
    <div className="workspace-creation-gateway space-y-6" data-testid="creation-project-gateway">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <button
          aria-label={`进入${liveProject.title}创作流程`}
          className="group glass-panel relative min-h-[372px] overflow-hidden rounded-[30px] border p-0 text-left shadow-panel transition duration-200 hover:translate-y-[-2px] hover:border-steel/60 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/45 active:translate-y-0"
          data-testid={`creation-project-${liveProject.id}`}
          onClick={() => onSelect(liveProject.id)}
          type="button"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-steel/15 via-moss/10 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-paper/45 to-transparent" />
          <div className="relative grid h-full gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_286px] lg:p-6">
            <div className="flex min-h-[314px] flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="blue">PC 创作入口</Pill>
                <Pill tone="green">{liveProject.status}</Pill>
                <Pill tone="amber">人工确认后发布</Pill>
              </div>

              <div className="mt-6 max-w-3xl">
                <div className="text-xs font-semibold text-muted">{liveProject.category}</div>
                <h2 className="mt-2 max-w-3xl text-3xl font-black leading-tight text-ink lg:text-[2.65rem]">
                  {liveProject.title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted lg:text-[15px]">
                  {liveProject.description}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 2xl:grid-cols-4">
                {liveProject.workflow.map((step, index) => {
                  const StepIcon = gatewayWorkflowIcons[index] ?? ShieldCheck;
                  return (
                    <div
                      className="min-h-[84px] rounded-[18px] border border-line/70 bg-paper/55 px-3 py-3 transition group-hover:border-steel/45 group-hover:bg-paper/70"
                      key={`live-project-step-${index}-${step}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <IconBox tone={gatewayWorkflowTones[index] ?? "blue"}>
                          <StepIcon className="h-4 w-4" />
                        </IconBox>
                        <span className="text-[11px] font-semibold text-muted">
                          0{index + 1}
                        </span>
                      </div>
                      <div className="mt-3 text-xs font-semibold leading-5 text-ink">{step}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 border-t border-line/70 pt-5 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold text-ink">输入资料</div>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {liveProject.inputs.join(" / ")}
                  </p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-ink">交付结果</div>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {liveProject.outputs.join(" / ")}
                  </p>
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="max-w-xl text-xs leading-5 text-muted">
                  推荐选题、自定义选题、知识依据、封面方向和复制确认保持同题同步。
                </span>
                <span className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper shadow-sm transition group-hover:translate-y-[-1px]">
                  <PenLine className="h-4 w-4" />
                  进入项目
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-line/70 bg-paper/58 p-4 shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.46)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black text-moss">一键生成</div>
                  <div className="mt-1 text-lg font-black leading-6 text-ink">
                    撰稿 + 封面图
                  </div>
                </div>
                <IconBox tone="green">
                  <Image className="h-4 w-4" />
                </IconBox>
              </div>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-3 border-b border-line/70 pb-3">
                  <span className="text-xs font-medium text-muted">知识依据</span>
                  <span className="text-xs font-semibold text-ink">跟随选题检索</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-line/70 pb-3">
                  <span className="text-xs font-medium text-muted">封面方向</span>
                  <span className="text-xs font-semibold text-ink">随主题同步</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted">发布动作</span>
                  <span className="text-xs font-semibold text-ink">人工确认后复制</span>
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full w-3/4 rounded-full bg-moss" />
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">
                桌面端保留批量管理空间，也让生成依据和确认边界更早露出来。
              </p>
            </div>
          </div>
        </button>

        <aside className="glass-panel rounded-[28px] border p-5 shadow-panel lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">确认状态</div>
              <p className="mt-1 text-xs leading-5 text-muted">发布前确认链路保持可见。</p>
            </div>
            <IconBox tone={latestContent ? "green" : "blue"}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookOpenText className="h-4 w-4" />
              )}
            </IconBox>
          </div>

          <div className="mt-6">
            <div className="rounded-[22px] border border-line/70 bg-paper/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">
                    {latestContent ? "已有历史草稿" : loading ? "正在读取草稿" : "还没有草稿"}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {latestContent
                      ? "进入项目后，可以从历史草稿中预览、复制或重新生成。"
                      : "先进入项目，填写选题后生成文案和封面。"}
                  </p>
                </div>
                <Pill tone={latestContent ? "green" : loading ? "blue" : "amber"}>
                  {latestContent ? "可继续" : loading ? "读取中" : "待开始"}
                </Pill>
              </div>
            </div>

            <div className="mt-4 divide-y divide-line/70 rounded-[22px] border border-line/70 bg-paper/45">
              {[
                ["采集", "先看来源，再入知识库"],
                ["生成", "只生成草稿和封面"],
                ["发布", "人工确认后手动复制"]
              ].map(([label, detail]) => (
                <div className="flex items-center justify-between gap-3 px-4 py-3" key={label}>
                  <span className="text-xs font-semibold text-ink">{label}</span>
                  <span className="text-right text-xs leading-5 text-muted">{detail}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[22px] border border-amber/45 bg-amber/10 p-4 text-xs leading-5 text-muted">
              所有项目都会保留人工确认节点；不会自动发布，也不会伪造采集、图片或效果数据。
            </div>
          </div>
        </aside>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-ink">后续自动化项目</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              这些模块先展示方向，接入后也会像「1.硕升博推广」一样进入独立创作流程。
            </p>
          </div>
          <Pill tone="neutral">仅展示</Pill>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {roadmapProjects.map((project) => (
            <article
              className="glass-subtle rounded-[24px] border p-4 opacity-85 transition hover:opacity-100"
              data-testid={`creation-project-${project.id}`}
              key={project.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-muted">{project.category}</div>
                  <h4 className="mt-1 text-lg font-semibold leading-6 text-ink">{project.title}</h4>
                </div>
                <Pill tone={project.statusTone}>{project.status}</Pill>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{project.description}</p>
              <div className="mt-4 grid grid-cols-1 gap-3 text-xs leading-5 sm:grid-cols-2">
                <div>
                  <div className="font-semibold text-ink">输入</div>
                  <div className="mt-1 text-muted">{project.inputs.join(" / ")}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink">交付</div>
                  <div className="mt-1 text-muted">{project.outputs.join(" / ")}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.workflow.map((step, index) => (
                  <span
                    className="rounded-md border border-line bg-paper/60 px-2 py-1 text-[11px] font-medium text-muted"
                    key={`${project.id}-workflow-${index}-${step}`}
                  >
                    {step}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
