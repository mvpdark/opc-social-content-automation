# OMPC Bug Check and Fix Log

## 2026-07-12 Check Round

### Scope

| Project | Path | Focus |
|---------|------|-------|
| OMPC-SSB Backend | `backend/app/` | Exception handling, type safety, SQL injection, data consistency, auth bypass |
| OMPC-SSB Frontend | `frontend/components/`, `frontend/lib/` | useState/useCallback deps, memory leaks, AbortController, type errors |
| OMPC | `C:\TRAE\OMPC\` | Startup scripts, config exception handling |
| OMPC-ZSCJ | `C:\TRAE\OMPC-ZSCJ\backend\` | API route exception handling, collector robustness |
| Env vars | `.env` vs `.env.example` | Variable consistency |
| Prompts | `prompts/` | Field correspondence |

### Fixed Bugs (5)

#### Bug 1: `run_ai_review` TOCTOU Race Condition [Medium]
- **File**: `backend/app/services/review_service.py` L235-248
- **Issue**: `run_ai_review` lacked pessimistic lock re-load and ownership re-validation between initial check and ContentReview write, creating a TOCTOU window. `request_human_review` and `record_human_review` in the same file both use `with_for_update=True`.
- **Fix**: Added `db.get(Content, content.id, with_for_update=True)` + ownership re-validation at function start, matching `record_human_review` pattern.
- **Verify**: `import app.services.review_service` OK

#### Bug 2: Dashboard `users` Count Always 1 [Low]
- **File**: `backend/app/api/v1/endpoints/workspace.py` L54
- **Issue**: `db.query(User).filter(User.id == current_user.id).count()` always returns 1, uses legacy Query API.
- **Fix**: Changed to `db.scalar(select(func.count(User.id))) or 0` for total system user count, using 2.0-style query.
- **Verify**: `import app.api.v1.endpoints.workspace` OK

#### Bug 3: workspace-settings.tsx AbortController Not Aborted on Unmount [Medium-High]
- **File**: `frontend/components/workspace-settings.tsx` L126-136, 216-218, 286-288, 339-341
- **Issue**: Three `useCallback` functions created local `AbortController` without storing in ref. Unmount cleanup only set `activeRef.current = false`, didn't abort controllers. `refreshProviderStatuses` didn't abort previous request. Inconsistent with `use-launcher-provider-status.ts` which correctly implements ref + abort pattern.
- **Fix**: Added 3 refs (`providerStatusAbortRef`, `providerKeyAbortRef`, `providerCheckAbortRef`); abort previous + store new in each callback; abort all on unmount.
- **Verify**: `npx next build` success

#### Bug 4: mobile-collect-screen.tsx deleteTrendSource No Abort Previous [Low-Medium]
- **File**: `frontend/components/mobile-collect-screen.tsx` L583
- **Issue**: `deleteTrendSource` didn't abort previous controller before creating new one. Rapid deletes left previous fetch running. Inconsistent with `use-draft-history.ts` pattern.
- **Fix**: Added `deleteAbortRef.current?.abort()` before creating new controller.
- **Verify**: `npx next build` success

#### Bug 5: android/page.tsx Type Error Blocking Build [Medium - Pre-existing]
- **File**: `frontend/app/android/page.tsx` L251
- **Issue**: `safeKeys` typed as `string[]`, indexing `Partial<typeof emptyCredentials>` with `string` caused TS error "No index signature", blocking `npx next build`.
- **Fix**: Added `as const` assertion to make `safeKeys` a literal tuple, `key` type becomes union of literal types.
- **Verify**: `npx next build` success, 5 pages generated

### Known Unfixed Issues (Need User Confirmation)

| # | Severity | File | Description | Reason |
|---|----------|------|-------------|--------|
| - | Critical | `.env` L15,39 | `deepseek-chat` model may be deprecated | Need user confirmation; project memory says use `deepseek-chat` |
| - | High | `.env` L7,20,24 | API Keys look like placeholders | May be injected via env vars |
| - | Medium | `frontend/.env.local` | Mixed API addresses (prod+local) | May be intentional |
| - | Medium | `OMPC-ZSCJ/.env` | AI extraction in codex_test mode | May be dev phase config |
| - | Low | `review_service.py` | `wrote_local_file` logic inaccurate | Needs `localize_image_url` return type refactor |
| - | Low | `workspace_service.py` | `apply_provider_key_settings` concurrent read visibility | Minimal impact under GIL |
| - | Low | `content.py` | `transition_task_state` redundant savepoint | No correctness issue, minor perf |
| - | Low | `trend_browser_collector.py` | `run_browser_collection_job` missing caller ownership check | Not directly exposed as API |
| - | Low | `workspace-generation-launcher.tsx` | eslint-disable exhaustive-deps | No actual stale closure |
| - | Low | `mobile-create-screen.tsx` | `addMobileBackHandler` dep array incomplete | Reference stable, no actual bug |

### Security Confirmation (No Issues)

- SQL Injection: All queries use SQLAlchemy ORM parameterized queries
- Auth Bypass: All API endpoints use `Depends(get_current_user)`
- user_id Filtering: All CRUD endpoints check `content.user_id != current_user.id`
- Password Security: PBKDF2-HMAC-SHA256 + random salt + timing-safe comparison
- SSRF Protection: IP pinning + DNS rebinding protection
- Path Traversal: Prompt filename whitelist validation
- Env Var Consistency: OMPC-SSB and OMPC-ZSCJ `.env` vs `.env.example` fully consistent
- Prompt Fields: All 5 prompt files match code builder function fields

### Verification Results

| Check | Result |
|-------|--------|
| `import app.services.review_service` | OK |
| `import app.api.v1.endpoints.workspace` | OK |
| `npx next build` | Success, 5 pages generated |


---

## 2026-07-12 Check Round 2

### Scope

| Project | Path | Focus |
|---------|------|-------|
| OMPC-SSB Backend | backend/app/ | Exception handling, IntegrityError, data consistency, auth, pessimistic lock |
| OMPC-SSB Frontend | frontend/components/, frontend/lib/ | useCallback deps, Object URL leak, eslint-disable |
| OMPC | C:\TRAE\OMPC\ | start_ompc.py exit code, .env.example sync |
| OMPC-ZSCJ | C:\TRAE\OMPC-ZSCJ\backend\ | Provider label, CORS port, duplicate prompts dir |
| Env vars | .env vs .env.example | Variable consistency (OMPC vs OMPC-SSB drift) |
| Prompts | prompts/ | Field correspondence (all match) |

### Fixed Bugs (11)

#### Bug 1: trend_browser_collector.py IntegrityError 全批丢失 [Medium]
- **File**: backend/app/services/trend_browser_collector.py L226-314
- **Issue**: _store_assets 的 db.commit() 失败时捕获 Exception 直接 raise，并发写入重复URL导致 IntegrityError 时整批采集数据丢失。
- **Fix**: 分层捕获 IntegrityError，回滚后改为逐条 savepoint 插入，跳过重复URL，重建 job 状态后重试提交。
- **Verify**: import app.services.trend_browser_collector OK

#### Bug 2: trend_service.py delete_trend_asset 未清理本地封面 [Medium]
- **File**: backend/app/services/trend_service.py L445-474
- **Issue**: 删除数据库记录但未清理磁盘上的本地化封面图片，产生孤儿文件。
- **Fix**: 删除前保存 cover_url，事务提交成功后调用 _cleanup_local_image_file 清理，失败时仅记录 warning。
- **Verify**: import app.services.trend_service OK

#### Bug 3: workspace.py dashboard 泄露全局用户总数 [Medium]
- **File**: backend/app/api/v1/endpoints/workspace.py L54
- **Issue**: 上轮修复将 users 改为 db.scalar(select(func.count(User.id))) 查询全局用户数，违反三账号数据隔离原则。
- **Fix**: 改为 users: 1，仪表盘只展示当前用户数据。
- **Verify**: import app.api.v1.endpoints.workspace OK

#### Bug 4: review_service.py if 分支缺少悲观锁 [Low]
- **File**: backend/app/services/review_service.py L50-63
- **Issue**: request_human_review 的 if 分支中 content 来自无锁加载，status 检查可能基于过期数据（TOCTOU）。
- **Fix**: 在 if 分支开头用 db.get(Content, content.id, with_for_update=True) 重新加载，与 else 分支保持一致。
- **Verify**: import app.services.review_service OK

#### Bug 5: images.py 多余 hasattr 检查 [Low]
- **File**: backend/app/api/v1/endpoints/images.py L71
- **Issue**: hasattr(image, created_by) 检查多余，created_by 是已定义列，可能掩盖迁移问题。
- **Fix**: 移除 hasattr 检查，直接使用 image.created_by == current_user.id。
- **Verify**: import app.api.v1.endpoints.images OK

#### Bug 6: start_ompc.py 服务失败仍返回退出码0 [High]
- **File**: C:\TRAE\OMPC\start_ompc.py L397
- **Issue**: main() 在服务启动失败时仅打印WARNING但不 sys.exit(1)，导致 bat 脚本始终打开浏览器。
- **Fix**: 在 _failed_services 非空时添加 sys.exit(1)。
- **Verify**: ast.parse OK

#### Bug 7: OMPC/.env.example 与 OMPC-SSB/.env.example 漂移 [Medium]
- **File**: C:\TRAE\OMPC\.env.example L39-40, L50
- **Issue**: 3个变量被注释掉（IMAGE_SIZE, IMAGE_RESPONSE_FORMAT, IMAGE_OPENAI_COMPATIBLE_BASE_URL），与 SSB 版本不一致。
- **Fix**: 取消注释，同步为与 OMPC-SSB 版本一致的值。
- **Verify**: 文件内容对比确认

#### Bug 8: ZSCJ model_router_helpers.py provider 标签未注册 [Low]
- **File**: C:\TRAE\OMPC-ZSCJ\backend\app\services\model_router_helpers.py L44, L63
- **Issue**: 招生抽取服务 不在 _provider_display_label 和 _redacted_provider_error 字典中，错误时回退到通用标签。
- **Fix**: 在两个字典中添加 招生抽取服务 条目。
- **Verify**: import app.services.model_router_helpers OK

#### Bug 9: ZSCJ CORS 包含未使用端口3000 [Low]
- **File**: C:\TRAE\OMPC-ZSCJ\backend\app\core\config.py L65
- **Issue**: CORS origin 正则允许端口3000，但无服务使用此端口，历史遗留配置。
- **Fix**: 移除 3000 端口。
- **Verify**: import app.core.config OK

#### Bug 10: ZSCJ 重复 prompts 目录 [Medium]
- **Path**: C:\TRAE\OMPC-ZSCJ\prompts\ (已删除)
- **Issue**: admission_extract.md 同时存在于根目录 prompts/ 和 backend/prompts/，代码只引用后者，造成维护隐患。
- **Fix**: 确认内容完全一致后删除根目录 prompts/ 目录。
- **Verify**: Glob 确认删除成功，backend/prompts/ 保留

#### Bug 11: workspace-generation-launcher.tsx eslint-disable 抑制依赖 [Low]
- **File**: frontend/components/workspace-generation-launcher.tsx L420-476
- **Issue**: previewSourceContext useCallback 使用 eslint-disable-next-line 抑制 exhaustive-deps 警告，buildGenerationRequestPayload 未列入依赖数组。
- **Fix**: 将 buildGenerationRequestPayload 包装为 useCallback，加入依赖数组，移除 eslint-disable。依赖项无变化，不影响重渲染行为。
- **Verify**: npx next build 成功，npx tsc --noEmit 通过

### No-Fix Items (Already Correct)

| # | File | Description | Conclusion |
|---|------|-------------|------------|
| - | frontend/lib/mobile-cover-share.ts | Object URL 泄漏疑虑 | 逻辑正确，每次调用前先 revoke 上一次的 URL，无泄漏 |

### Known Unfixed Issues (Need User Confirmation)

| # | Severity | File | Description | Reason |
|---|----------|------|-------------|--------|
| - | High | C:\TRAE\OMPC\cf-config.yml | 文件缺失，Cloudflare 隧道无法启动 | 禁止修改/创建 cf-config.yml |
| - | High | C:\TRAE\OMPC\cache-bust-proxy.js | 文件缺失，缓存破坏代理无法启动 | 禁止修改/创建 cache-bust-proxy.js |
| - | Medium | frontend/.env.local | 使用生产API URL而非localhost | 可能是生产部署配置 |
| - | Low | OMPC\test_overwrite.ps1 | 测试脚本可能误覆盖生产文件 | 需用户确认是否删除 |
| - | Low | OMPC\copy_fixed.ps1 | 非原子复制覆盖 | 需用户确认是否更新 |
| - | Low | content_source_context.py | 未捕获 RuntimeError 等异常 | 设计决策，全局处理器兜底 |
| - | Low | workspace_service.py | 配置读写线程安全 | GIL 缓解，实际风险极低 |

### Security Confirmation (No Issues)

- SQL Injection: 所有查询使用 SQLAlchemy ORM 参数化查询
- Auth Bypass: 所有端点使用 Depends(get_current_user) 或 require_writer_role
- user_id Filtering: 所有 CRUD 端点按 current_user.id 过滤
- SSRF Protection: ZSCJ 实现完整 SSRF 防护（IP pinning + DNS 重绑定检测）
- Env Var Consistency: OMPC-SSB 和 OMPC-ZSCJ 的 .env vs .env.example 完全一致；OMPC/.env.example 已同步
- Prompt Fields: 所有7个 prompt 文件与代码引用完全对应

### Verification Results

| Check | Result |
|-------|--------|
| import app.services.trend_browser_collector | OK |
| import app.services.trend_service | OK |
| import app.api.v1.endpoints.workspace | OK |
| import app.services.review_service | OK |
| import app.api.v1.endpoints.images | OK |
| import app.services.model_router_helpers | OK |
| import app.core.config (ZSCJ) | OK |
| ast.parse start_ompc.py | OK |
| npx tsc --noEmit | 通过 |
| npx next build | 成功，5页面生成 |
