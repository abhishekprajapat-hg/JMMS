#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

BRANCH="${BRANCH:-main}"
BACKEND_PORT="${BACKEND_PORT:-4000}"
PM2_APP_NAME="${PM2_APP_NAME:-jmms-backend}"
WEB_ROOT="${WEB_ROOT:-/var/www/jmms/frontend}"
SKIP_PULL="${SKIP_PULL:-false}"

need_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Missing command: ${cmd}"
    exit 1
  fi
}

run_or_sudo() {
  if "$@"; then
    return 0
  fi
  if command -v sudo >/dev/null 2>&1; then
    sudo "$@"
    return 0
  fi
  return 1
}

need_cmd git
need_cmd npm
need_cmd node
need_cmd pm2
need_cmd rsync

if [[ ! -d backend || ! -d frontend ]]; then
  echo "Run this script from JMMS project root."
  exit 1
fi

if [[ "${SKIP_PULL}" != "true" && -d .git ]]; then
  echo "==> Pulling latest code (${BRANCH})"
  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"
  git pull --ff-only origin "${BRANCH}"
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

echo "==> Publishing frontend build to ${WEB_ROOT}"
run_or_sudo mkdir -p "${WEB_ROOT}"
run_or_sudo rsync -a --delete "${SCRIPT_DIR}/frontend/dist/" "${WEB_ROOT}/"
run_or_sudo chown -R www-data:www-data "${WEB_ROOT}" || true

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
  echo "==> Reloading nginx"
  run_or_sudo nginx -t || true
  run_or_sudo systemctl reload nginx || true
fi

echo "==> Done"
if command -v curl >/dev/null 2>&1; then
  curl -sS "http://127.0.0.1:${BACKEND_PORT}/health" || true
  echo
fi
