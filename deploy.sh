#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

BRANCH="${BRANCH:-main}"
BACKEND_PORT="${BACKEND_PORT:-5200}"
PM2_APP_NAME="${PM2_APP_NAME:-jmms-backend}"
USER_WEB_ROOT="${USER_WEB_ROOT:-${SCRIPT_DIR}/user-frontend/dist}"
ADMIN_WEB_ROOT="${ADMIN_WEB_ROOT:-${SCRIPT_DIR}/frontend/dist}"
ADMIN_APP_BASE="${ADMIN_APP_BASE:-/admin/}"
SKIP_PULL="${SKIP_PULL:-false}"

need_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Missing command: ${cmd}"
    exit 1
  fi
}

need_cmd git
need_cmd npm
need_cmd node
need_cmd pm2

if [[ ! -d backend || ! -d frontend || ! -d user-frontend ]]; then
  echo "Run this script from JMMS project root."
  exit 1
fi

normalize_base_path() {
  local base="$1"
  base="${base#/}"
  base="/${base}"
  if [[ "${base}" != "/" && "${base}" != */ ]]; then
    base="${base}/"
  fi
  echo "${base}"
}

publish_build() {
  local source_dir="$1"
  local target_dir="$2"
  local label="$3"
  shift 3
  local rsync_extra=("$@")

  if [[ "${target_dir}" == "${source_dir}" ]]; then
    echo "==> Using ${source_dir} for ${label} (no copy needed)"
    return 0
  fi

  need_cmd rsync
  echo "==> Publishing ${label} build to ${target_dir}"
  if mkdir -p "${target_dir}" 2>/dev/null && rsync -a --delete "${rsync_extra[@]}" "${source_dir}/" "${target_dir}/"; then
    return 0
  fi

  if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    sudo mkdir -p "${target_dir}"
    sudo rsync -a --delete "${rsync_extra[@]}" "${source_dir}/" "${target_dir}/"
    sudo chown -R www-data:www-data "${target_dir}" || true
    return 0
  fi

  echo "No permission to write ${target_dir}. Set ${label} web root to a writable path or run with sudo access."
  exit 1
}

if [[ ! -d .git ]]; then
  echo "==> One-time git bootstrap"
  git init
  git remote add origin "${REPO_URL:-https://github.com/abhishekprajapat-hg/JMMS.git}" 2>/dev/null || true
fi

if [[ "${SKIP_PULL}" != "true" ]]; then
  echo "==> Updating code (${BRANCH})"
  git remote set-url origin "${REPO_URL:-https://github.com/abhishekprajapat-hg/JMMS.git}"
  git fetch origin "${BRANCH}"
  git checkout -f -B "${BRANCH}" "origin/${BRANCH}"
  git reset --hard "origin/${BRANCH}"
fi

if [[ ! -f backend/.env ]]; then
  echo "Missing backend/.env"
  echo "Create backend/.env first, then run deploy again."
  exit 1
fi

echo "==> Installing backend deps"
cd backend
npm ci --omit=dev

echo "==> Installing user frontend deps and building"
cd ../user-frontend
npm ci
npm run build

echo "==> Installing admin frontend deps and building"
cd ../frontend
npm ci
ADMIN_APP_BASE="$(normalize_base_path "${ADMIN_APP_BASE}")"
VITE_APP_BASE="${ADMIN_APP_BASE}" npm run build

USER_SOURCE_DIR="${SCRIPT_DIR}/user-frontend/dist"
ADMIN_SOURCE_DIR="${SCRIPT_DIR}/frontend/dist"
USER_TARGET_DIR="${USER_WEB_ROOT%/}"
ADMIN_TARGET_DIR="${ADMIN_WEB_ROOT%/}"

RSYNC_USER_EXCLUDES=()
if [[ "${ADMIN_TARGET_DIR}" == "${USER_TARGET_DIR}/"* ]]; then
  ADMIN_REL_PATH="${ADMIN_TARGET_DIR#${USER_TARGET_DIR}/}"
  if [[ -n "${ADMIN_REL_PATH}" ]]; then
    RSYNC_USER_EXCLUDES+=(--exclude "${ADMIN_REL_PATH}/")
  fi
fi

publish_build "${USER_SOURCE_DIR}" "${USER_TARGET_DIR}" "user frontend" "${RSYNC_USER_EXCLUDES[@]}"
publish_build "${ADMIN_SOURCE_DIR}" "${ADMIN_TARGET_DIR}" "admin frontend"

echo "==> Starting/restarting backend with PM2"
export PM2_APP_NAME BACKEND_PORT JMMS_BACKEND_CWD="${SCRIPT_DIR}/backend"
if [[ -f "${SCRIPT_DIR}/deploy/pm2/ecosystem.config.cjs" ]]; then
  pm2 startOrRestart "${SCRIPT_DIR}/deploy/pm2/ecosystem.config.cjs" --env production
else
  if pm2 describe "${PM2_APP_NAME}" >/dev/null 2>&1; then
    pm2 restart "${PM2_APP_NAME}"
  else
    pm2 start "${SCRIPT_DIR}/backend/src/server.js" --name "${PM2_APP_NAME}" --env production
  fi
fi
pm2 save

if command -v nginx >/dev/null 2>&1; then
  if nginx -t >/dev/null 2>&1; then
    systemctl reload nginx >/dev/null 2>&1 || true
  elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    echo "==> Reloading nginx"
    sudo nginx -t || true
    sudo systemctl reload nginx || true
  fi
fi

echo "==> Done"
if command -v curl >/dev/null 2>&1; then
  curl -sS "http://127.0.0.1:${BACKEND_PORT}/health" || true
  echo
fi
