"use client";

import { useState, type FormEvent } from "react";
import { Image, KeyRound, LockKeyhole, Loader2, PenLine, ShieldCheck, UserRound } from "lucide-react";
import { type InterfaceStyle } from "@/lib/dashboard-data";
import { authenticateWorkspaceLogin } from "./workspace-utils";
import { Pill } from "./workspace-ui";

export function PcLoginPage({
  interfaceStyle,
  loading,
  onLogin
}: {
  interfaceStyle: InterfaceStyle;
  loading: boolean;
  onLogin: (account: string) => void;
}) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const busy = loading || isSubmitting;

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) {
      return;
    }
    const normalizedAccount = account.trim();
    if (!normalizedAccount || !password) {
      setError("请输入账号和密码。");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const result = await authenticateWorkspaceLogin(normalizedAccount, password);
      onLogin(result.account);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={`theme-${interfaceStyle} workspace-shell min-h-screen text-ink`}>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <section className="grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="glass-panel overflow-hidden rounded-[28px] border shadow-panel">
            <div className="flex h-full min-h-[520px] flex-col justify-between p-6 lg:p-8">
              <div>
                <div className="flex items-center gap-3">
                  <img
                    alt="OPC 应用图标"
                    className="h-14 w-14 rounded-[18px] object-cover shadow-[0_18px_38px_rgba(37,99,235,0.2)]"
                    src="/app-icon.png"
                  />
                  <div>
                    <div className="text-lg font-semibold leading-6">OPC</div>
                    <div className="text-sm text-muted">AI 任务执行平台</div>
                  </div>
                </div>
                <div className="mt-10 flex flex-wrap gap-2">
                  <Pill tone="blue">PC 工作台</Pill>
                  <Pill tone="green">本地预览</Pill>
                  <Pill tone="amber">人工确认后发布</Pill>
                </div>
                <h1 className="mt-5 max-w-xl text-3xl font-semibold leading-tight text-ink md:text-4xl">
                  登录后即可启动小红书获客任务。
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
                  进入工作台后，先准备资料和趋势参考，再生成文案、封面和发布清单，最终仍由人工确认提交。
                </p>
              </div>

              <div className="grid gap-3 text-sm text-muted md:grid-cols-3">
                {[
                  { icon: PenLine, title: "生成草稿", body: "标题、正文、标签统一输出。" },
                  { icon: Image, title: "封面预览", body: "先看发布后的首屏效果。" },
                  { icon: ShieldCheck, title: "安全确认", body: "发布前保留人工把关。" }
                ].map((item, index) => (
                  <div
                    className="rounded-[18px] border border-line bg-paper/55 p-4"
                    key={`home-feature-${index}-${item.title}`}
                  >
                    <item.icon className="h-4 w-4 text-steel" />
                    <div className="mt-3 font-semibold text-ink">{item.title}</div>
                    <div className="mt-1 text-xs leading-5">{item.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <form
            className="glass-panel flex min-h-[520px] flex-col justify-between rounded-[28px] border p-5 shadow-panel sm:p-6"
            data-testid="pc-login-form"
            onSubmit={submitLogin}
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-steel/10 text-steel">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold leading-8">登录 OPC 工作台</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                请输入分配给你的账号和密码。登录状态只保存在这台设备上，不会保存密码。
              </p>

              <label className="mt-8 block text-sm font-medium text-ink" htmlFor="pc-login-account">
                账号
              </label>
              <div className="relative mt-2">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  autoComplete="username"
                  className="glass-control h-11 w-full rounded-md border py-2 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-steel/50 focus:ring-2 focus:ring-steel/20"
                  data-testid="pc-login-account"
                  disabled={busy}
                  id="pc-login-account"
                  onChange={(event) => setAccount(event.target.value)}
                  placeholder="请输入账号"
                  value={account}
                />
              </div>

              <label className="mt-5 block text-sm font-medium text-ink" htmlFor="pc-login-password">
                密码
              </label>
              <div className="relative mt-2">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  autoComplete="current-password"
                  className="glass-control h-11 w-full rounded-md border py-2 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-steel/50 focus:ring-2 focus:ring-steel/20"
                  data-testid="pc-login-password"
                  disabled={busy}
                  id="pc-login-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入密码"
                  type="password"
                  value={password}
                />
              </div>

              {error ? (
                <div
                  className="mt-5 rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-sm leading-6 text-ink"
                  data-testid="pc-login-error"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
            </div>

            <div className="mt-8">
              <button
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-paper transition hover:translate-y-[-1px] hover:shadow-[0_16px_32px_rgba(15,23,42,0.2)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="pc-login-submit"
                disabled={busy}
                type="submit"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                {loading ? "正在检查登录状态" : isSubmitting ? "正在登录" : "登录并进入工作台"}
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-muted">
                忘记账号或密码时，请联系工作台管理员重置。
              </p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
