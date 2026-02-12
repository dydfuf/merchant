#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-$(pwd)}"

if [[ ! -d "${ROOT_DIR}" ]]; then
  echo "[ERROR] Repository path not found: ${ROOT_DIR}" >&2
  exit 1
fi

cd "${ROOT_DIR}"

echo "== Repository Snapshot =="
echo "root: ${ROOT_DIR}"

echo
echo "== Apps =="
if [[ -d apps ]]; then
  find apps -mindepth 1 -maxdepth 1 -type d | sort
else
  echo "(none)"
fi

echo
echo "== Packages =="
if [[ -d packages ]]; then
  find packages -mindepth 1 -maxdepth 1 -type d | sort
else
  echo "(none)"
fi

echo
echo "== Tooling Files =="
for file in package.json pnpm-workspace.yaml turbo.json vitest.workspace.ts; do
  if [[ -f "${file}" ]]; then
    echo "[OK] ${file}"
  else
    echo "[MISSING] ${file}"
  fi
done

echo
echo "== Markdown Path Drift (apps/*, packages/*) =="

if command -v rg >/dev/null 2>&1; then
  refs_tmp="$(mktemp)"
  file_count=0

  while IFS= read -r -d '' md_file; do
    file_count=$((file_count + 1))
    rg -No "(apps|packages)/[A-Za-z0-9._/-]+" "${md_file}" >>"${refs_tmp}" || true
  done < <(find . -type f -name "*.md" \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./.turbo/*" \
    -print0)

  if [[ ${file_count} -eq 0 ]]; then
    rm -f "${refs_tmp}"
    echo "No markdown files found."
    exit 0
  fi
else
  echo "[WARN] ripgrep (rg) not found; skipping path drift scan."
  exit 0
fi

missing_count=0
while IFS= read -r ref; do
  ref="${ref%/}"
  [[ -z "${ref}" ]] && continue
  if [[ ! -e "${ref}" ]]; then
    echo "[MISSING_REF] ${ref}"
    missing_count=$((missing_count + 1))
  fi
done < <(sort -u "${refs_tmp}")

rm -f "${refs_tmp}"

if [[ ${missing_count} -eq 0 ]]; then
  echo "No missing markdown path references found."
else
  echo "Found ${missing_count} missing markdown path reference(s)."
fi
