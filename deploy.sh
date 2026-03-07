#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

BRANCH="${BRANCH:-main}"
BACKEND_PORT="${BACKEND_PORT:-5200}"
PM2_APP_NAME="${PM2_APP_NAME:-jmms-backend}"
WEB_ROOT="${WEB_ROOT:-${SCRIPT_DIR}/frontend/dist}"
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

if [[ ! -d backend || ! -d frontend ]]; then
  echo "Run this script from JMMS project root."
  exit 1
fi

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

echo "==> Installing frontend deps and building"
cd ../frontend
npm ci
npm run build

if [[ "${WEB_ROOT}" == "${SCRIPT_DIR}/frontend/dist" ]]; then
  echo "==> Using frontend/dist as web root (no copy needed)"
else
  need_cmd rsync
  echo "==> Publishing frontend build to ${WEB_ROOT}"
  if mkdir -p "${WEB_ROOT}" 2>/dev/null && rsync -a --delete "${SCRIPT_DIR}/frontend/dist/" "${WEB_ROOT}/"; then
    true
  elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    sudo mkdir -p "${WEB_ROOT}"
    sudo rsync -a --delete "${SCRIPT_DIR}/frontend/dist/" "${WEB_ROOT}/"
    sudo chown -R www-data:www-data "${WEB_ROOT}" || true
  else
    echo "No permission to write ${WEB_ROOT}. Set WEB_ROOT=${SCRIPT_DIR}/frontend/dist or run with sudo access."
    exit 1
  fi
fi

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
