from __future__ import annotations

import argparse
import os
import py_compile
import shutil
from pathlib import Path

from validators import (
    validate_android_shell_contract,
    validate_content_production_contract,
    validate_frontend_design_contract,
    validate_json_configs,
    validate_login_failure_contract,
    validate_migration_chain,
    validate_promotion_precision_loop_docs,
    validate_required_files,
    validate_safety_gates,
    validate_text_hygiene,
    validate_topic_intent_runtime_contract,
    validate_topic_presets_contract,
)
from validators._helpers import ROOT, SKIP_DIRS


def compile_backend() -> int:
    py_files = [
        file
        for file in sorted((ROOT / "backend").rglob("*.py"))
        if not SKIP_DIRS.intersection(file.relative_to(ROOT).parts)
    ]
    for file in py_files:
        py_compile.compile(str(file), doraise=True)
    return len(py_files)


def clean_pycache() -> int:
    count = 0
    for dirpath, dirnames, _ in os.walk(ROOT, onerror=lambda e: None):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        if "__pycache__" in dirnames:
            cache_dir = Path(dirpath) / "__pycache__"
            resolved = cache_dir.resolve()
            if ROOT == resolved or ROOT not in resolved.parents:
                raise SystemExit(f"Refusing to remove outside project: {resolved}")
            shutil.rmtree(resolved)
            count += 1
            dirnames.remove("__pycache__")
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify OPC project structure.")
    parser.add_argument("--keep-cache", action="store_true")
    args = parser.parse_args()

    results = {
        "python_files_compiled": compile_backend(),
        "json_configs_valid": validate_json_configs(),
        "required_files_present": validate_required_files(),
        "promotion_precision_loop_docs_checked": validate_promotion_precision_loop_docs(),
        "migration_chain_checked": validate_migration_chain(),
        "safety_gates_checked": validate_safety_gates(),
        "login_failure_contract_checked": validate_login_failure_contract(),
        "frontend_design_contract_checked": validate_frontend_design_contract(),
        "topic_presets_contract_checked": validate_topic_presets_contract(),
        "topic_intent_runtime_contract_checked": validate_topic_intent_runtime_contract(),
        "content_production_contract_checked": validate_content_production_contract(),
        "android_shell_contract_checked": validate_android_shell_contract(),
        "text_hygiene_files_checked": validate_text_hygiene(),
    }
    if not args.keep_cache:
        results["removed_pycache_dirs"] = clean_pycache()

    for key, value in results.items():
        print(f"{key}={value}")


if __name__ == "__main__":
    main()
