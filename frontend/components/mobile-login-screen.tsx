"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";
import {
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRound
} from "lucide-react";

import { getApiBase } from "@/lib/api-base";
import { readApiError } from "@/lib/mobile-runtime";
import {
  sanitizeProviderStatusItems,
  type ProviderStatusItem
} from "@/lib/provider-settings";

type MobileLoginResponse = {
  account: string;
  access_token?: string;
  default_keys_bound: boolean;
  key_profile: string;
  provider_statuses: ProviderStatusItem[];
};

function isMobileLoginResponse(value: unknown): value is MobileLoginResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.account === "string" &&
    typeof v.default_keys_bound === "boolean" &&
    typeof v.key_profile === "string" &&
    Array.isArray(v.provider_statuses)
  );
}

const API_BASE = getApiBase();

async function authenticateMobileLogin(account: string, password: string, signal?: AbortSignal) {
  try {
    const response = await fetch(`${API_BASE}/auth/mobile-login`, {
      body: JSON.stringify({ account, password }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal
    });
    if (response.ok) {
      const raw: unknown = await response.json().catch(() => null);
      if (!isMobileLoginResponse(raw) || !raw.account.trim()) {
        throw new Error("登录服务响应异常，请稍后再试。");
      }
      const accessToken = typeof raw.access_token === "string" ? raw.access_token : "";
      if (!accessToken) {
        throw new Error("登录服务未返回有效的访问令牌，请稍后再试。");
      }
      return {
        account: raw.account.trim(),
        accessToken,
        defaultKeysBound: raw.default_keys_bound,
        providerStatuses: sanitizeProviderStatusItems(raw.provider_statuses)
      };
    }
    if (response.status === 404 || response.status === 405) {
      throw new Error("登录服务暂未更新，请重新打开应用后再试。");
    }
    if (response.status >= 500) {
      throw new Error(await readApiError(response, "登录服务暂时不可用，请稍后再试。"));
    }
    throw new Error("账号或密码不正确。");
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("登录服务暂时不可用，请确认应用服务已启动。");
    }
    throw error;
  }
}
export const LoginScreen = memo(function LoginScreen({
  isNativeShell,
  loading,
  onLogin
}: {
  isNativeShell: boolean;
  loading: boolean;
  onLogin: (
    account: string,
    providerStatuses: ProviderStatusItem[],
    defaultKeysBound: boolean,
    accessToken: string
  ) => void;
}) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const activeRef = useRef(true);
  const submittingRef = useRef(false);
  const loginAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      loginAbortRef.current?.abort();
    };
  }, []);

  const handleAccountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setAccount(event.target.value);
  }, []);

  const handlePasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  }, []);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const normalizedAccount = account.trim();

    if (!normalizedAccount || !password) {
      setError("请输入账号和密码。");
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    setError("");
    try {
      loginAbortRef.current?.abort();
      const loginController = new AbortController();
      loginAbortRef.current = loginController;
      const loginResult = await authenticateMobileLogin(normalizedAccount, password, loginController.signal);
      if (!activeRef.current) return;
      onLogin(loginResult.account, loginResult.providerStatuses, loginResult.defaultKeysBound, loginResult.accessToken);
    } catch (loginError) {
      if (!activeRef.current) return;
      setError(loginError instanceof Error ? loginError.message : "账号或密码不正确。");
    } finally {
      submittingRef.current = false;
      if (activeRef.current) {
        setBusy(false);
      }
    }
  }

  if (loading) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center px-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在检查登录状态
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col justify-center px-6 pb-[calc(26px+env(safe-area-inset-bottom))] pt-3">
      <div className="mb-9">
        <img
          alt=""
          className="h-14 w-14 rounded-[18px] object-cover shadow-[0_18px_36px_rgba(24,64,52,0.18)]"
          src="/app-icon.png"
        />
        <div className="mt-6 text-xs font-black text-moss">{isNativeShell ? "OMPC工作站" : "OPC Mobile"}</div>
        <h1 className="mt-1 text-[34px] font-black leading-10 tracking-normal text-ink">
          登录手机工作台
        </h1>
        <p className="mt-3 max-w-[300px] text-sm font-medium leading-6 text-muted">
          请输入分配给你的账号和密码。
        </p>
      </div>
      <form className="space-y-3" data-testid="mobile-login-form" onSubmit={submitLogin}>
        <label className="block">
          <span className="text-xs font-semibold text-muted">账号</span>
          <div className="mt-2 flex h-[52px] items-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.92)] px-4 shadow-[0_10px_26px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.88)]">
            <UserRound className="h-4 w-4 shrink-0 text-muted" />
            <input
              autoComplete="username"
              className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none"
              name="login-account" data-testid="mobile-login-account"
              onChange={handleAccountChange}
              placeholder="请输入账号"
              value={account}
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-muted">密码</span>
          <div className="mt-2 flex h-[52px] items-center gap-2 rounded-full border border-white/[0.84] bg-[rgba(255,253,247,0.92)] px-4 shadow-[0_10px_26px_rgba(31,58,49,0.07),inset_0_1px_0_rgba(255,255,255,0.88)]">
            <LockKeyhole className="h-4 w-4 shrink-0 text-muted" />
            <input
              autoComplete="current-password"
              className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none"
              name="login-password" data-testid="mobile-login-password"
              onChange={handlePasswordChange}
              placeholder="请输入密码"
              type="password"
              value={password}
            />
          </div>
        </label>

        {error ? (
          <div
            className="rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-xs font-medium leading-5 text-ink"
            data-testid="mobile-login-error"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <button
          className="flex h-[52px] w-full touch-manipulation items-center justify-center gap-2 rounded-[18px] bg-moss text-sm font-black text-white shadow-[0_16px_34px_rgba(44,151,88,0.20)] active:scale-[0.99] disabled:opacity-60"
          data-testid="mobile-login-submit"
          disabled={busy}
          type="submit"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {busy ? "登录中" : "登录"}
        </button>
      </form>
    </section>
  );
});
