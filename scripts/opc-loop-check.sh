#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/frontend"

run_step() {
  local name="$1"
  shift
  echo
  echo "==> $name"
  "$@"
}

detect_package_manager() {
  local dir="$1"
  if [ -f "$dir/pnpm-lock.yaml" ]; then
    echo "pnpm"
  elif [ -f "$dir/yarn.lock" ]; then
    echo "yarn"
  elif [ -f "$dir/bun.lockb" ] || [ -f "$dir/bun.lock" ]; then
    echo "bun"
  elif [ -f "$dir/package-lock.json" ] || [ -f "$dir/package.json" ]; then
    echo "npm"
  else
    echo ""
  fi
}

has_script() {
  local dir="$1"
  local script="$2"
  [ -f "$dir/package.json" ] &&
    node -e "const p=require(process.argv[1]); process.exit(p.scripts && p.scripts[process.argv[2]] ? 0 : 1)" \
      "$dir/package.json" "$script" >/dev/null 2>&1
}

run_package_script() {
  local dir="$1"
  local pm="$2"
  local script="$3"
  if ! has_script "$dir" "$script"; then
    echo "-- Skipping missing script in ${dir#$ROOT/}: $script"
    return 0
  fi

  case "$pm" in
    pnpm) run_step "${dir#$ROOT/}:$script" pnpm --dir "$dir" run "$script" ;;
    yarn) (cd "$dir" && run_step "${dir#$ROOT/}:$script" yarn "$script") ;;
    bun) (cd "$dir" && run_step "${dir#$ROOT/}:$script" bun run "$script") ;;
    npm) (cd "$dir" && run_step "${dir#$ROOT/}:$script" npm run "$script") ;;
    *) echo "-- No package manager detected for ${dir#$ROOT/}" ;;
  esac
}

cd "$ROOT"

if [ -f "$ROOT/scripts/verify_project.py" ]; then
  run_step "project contract checks" python "$ROOT/scripts/verify_project.py"
fi

if [ -d "$ROOT/backend/tests" ]; then
  run_step "backend tests" python -m pytest "$ROOT/backend/tests"
fi

FRONTEND_PM="$(detect_package_manager "$FRONTEND")"
if [ -n "$FRONTEND_PM" ]; then
  echo "Detected frontend package manager: $FRONTEND_PM"
  for script in lint typecheck test build; do
    run_package_script "$FRONTEND" "$FRONTEND_PM" "$script"
  done
else
  echo "-- Skipping frontend checks: no package manager detected in frontend/"
fi

if [ -f "$ROOT/playwright.config.ts" ] || [ -f "$ROOT/playwright.config.js" ] || [ -f "$ROOT/playwright.config.mjs" ]; then
  run_step "Playwright E2E" npx playwright test
elif [ -f "$FRONTEND/playwright.config.ts" ] || [ -f "$FRONTEND/playwright.config.js" ] || [ -f "$FRONTEND/playwright.config.mjs" ]; then
  (cd "$FRONTEND" && run_step "Playwright E2E" npx playwright test)
elif [ -d "$ROOT/tests/e2e" ]; then
  echo "-- E2E specs are present in tests/e2e, but no Playwright JS config is configured yet."
fi
