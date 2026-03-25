#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage: ./deploy.sh [--skip-verify]

Deploys the current JMMS codebase to the configured server.
It uploads source code, keeps remote runtime data intact, rebuilds the apps,
and restarts the backend with PM2.

Optional environment overrides:
  REMOTE_USER=jmms
  REMOTE_HOST=72.60.97.58
  REMOTE_PORT=2424
  REMOTE_ROOT=/home/jmms/jmms
  REMOTE_LINK=/home/jmms/jssm
  PM2_APP_NAME=jmms-backend
  PUBLIC_DOMAIN=nemnidhi.tech
  ADMIN_DOMAIN=admin.nemnidhi.tech
  BACKEND_PORT=5200
EOF
}

VERIFY_AFTER_DEPLOY=1
while (($#)); do
  case "$1" in
    --skip-verify)
      VERIFY_AFTER_DEPLOY=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_USER="${REMOTE_USER:-jmms}"
REMOTE_HOST="${REMOTE_HOST:-72.60.97.58}"
REMOTE_PORT="${REMOTE_PORT:-2424}"
REMOTE_ROOT="${REMOTE_ROOT:-/home/${REMOTE_USER}/jmms}"
REMOTE_LINK="${REMOTE_LINK:-/home/${REMOTE_USER}/jssm}"
PM2_APP_NAME="${PM2_APP_NAME:-jmms-backend}"
PUBLIC_DOMAIN="${PUBLIC_DOMAIN:-nemnidhi.tech}"
ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.nemnidhi.tech}"
BACKEND_PORT="${BACKEND_PORT:-5200}"

SSH_TARGET="${REMOTE_USER}@${REMOTE_HOST}"
SSH_OPTS=(-p "${REMOTE_PORT}" -o StrictHostKeyChecking=accept-new)
SCP_OPTS=(-P "${REMOTE_PORT}" -o StrictHostKeyChecking=accept-new)

if [[ -z "${REMOTE_ROOT}" || -z "${REMOTE_LINK}" ]]; then
  echo "REMOTE_ROOT and REMOTE_LINK must not be empty." >&2
  exit 1
fi

if [[ "${REMOTE_ROOT}" == "/" || "${REMOTE_LINK}" == "/" || "${REMOTE_ROOT}" == "${REMOTE_LINK}" ]]; then
  echo "Unsafe remote path configuration detected. Check REMOTE_ROOT and REMOTE_LINK." >&2
  exit 1
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Missing required file: $1" >&2
    exit 1
  fi
}

for cmd in ssh scp tar grep mktemp tr date; do
  require_cmd "$cmd"
done

require_file "${SCRIPT_DIR}/backend/.env"
require_file "${SCRIPT_DIR}/backend/package.json"
require_file "${SCRIPT_DIR}/frontend/package.json"
require_file "${SCRIPT_DIR}/user-frontend/package.json"

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/jmms-deploy.XXXXXX")"
ARCHIVE_PATH="${TEMP_DIR}/jmms-deploy.tgz"
BACKEND_ENV_PATH="${TEMP_DIR}/backend.env"
REMOTE_ARCHIVE="/tmp/jmms-deploy-$(date +%s).tgz"
REMOTE_ENV="/tmp/jmms-backend-$(date +%s).env"

cleanup() {
  rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

generate_backend_env() {
  local src_file="${SCRIPT_DIR}/backend/.env"
  local out_file="$1"

  tr -d '\r' < "${src_file}" \
    | grep -Ev '^(PORT|NODE_ENV|FRONTEND_ORIGIN|FRONTEND_ORIGINS|RECEIPT_PUBLIC_BASE_URL)=' \
    > "${out_file}"

  {
    printf 'PORT=%s\n' "${BACKEND_PORT}"
    printf 'NODE_ENV=production\n'
    printf 'FRONTEND_ORIGIN=https://%s\n' "${PUBLIC_DOMAIN}"
    printf 'FRONTEND_ORIGINS=https://%s,https://www.%s,https://%s\n' "${PUBLIC_DOMAIN}" "${PUBLIC_DOMAIN#www.}" "${ADMIN_DOMAIN}"
    printf 'RECEIPT_PUBLIC_BASE_URL=https://%s\n' "${PUBLIC_DOMAIN}"
  } >> "${out_file}"
}

printf -v REMOTE_ROOT_Q '%q' "${REMOTE_ROOT}"
printf -v REMOTE_LINK_Q '%q' "${REMOTE_LINK}"
printf -v PM2_APP_NAME_Q '%q' "${PM2_APP_NAME}"
printf -v REMOTE_ARCHIVE_Q '%q' "${REMOTE_ARCHIVE}"
printf -v REMOTE_ENV_Q '%q' "${REMOTE_ENV}"
printf -v BACKEND_PORT_Q '%q' "${BACKEND_PORT}"

cat > "${TEMP_DIR}/remote-deploy.sh" <<EOF
#!/usr/bin/env bash
set -Eeuo pipefail

REMOTE_ROOT=${REMOTE_ROOT_Q}
REMOTE_LINK=${REMOTE_LINK_Q}
PM2_APP_NAME=${PM2_APP_NAME_Q}
REMOTE_ARCHIVE=${REMOTE_ARCHIVE_Q}
REMOTE_ENV=${REMOTE_ENV_Q}
BACKEND_PORT=${BACKEND_PORT_Q}
STAGE_DIR="\$(mktemp -d /tmp/jmms-stage.XXXXXX)"

cleanup_remote() {
  rm -rf "\${STAGE_DIR}"
  rm -f "\${REMOTE_ARCHIVE}" "\${REMOTE_ENV}" "\$HOME/deploy_jmms_remote.sh"
}
trap cleanup_remote EXIT

mkdir -p "\${REMOTE_ROOT}"
tar -xzf "\${REMOTE_ARCHIVE}" -C "\${STAGE_DIR}"

mkdir -p "\${REMOTE_ROOT}/backend"
find "\${REMOTE_ROOT}/backend" -mindepth 1 -maxdepth 1 ! -name data -exec rm -rf {} +
cp -a "\${STAGE_DIR}/backend/." "\${REMOTE_ROOT}/backend/"
mv "\${REMOTE_ENV}" "\${REMOTE_ROOT}/backend/.env"

rm -rf "\${REMOTE_ROOT}/frontend"
mkdir -p "\${REMOTE_ROOT}/frontend"
cp -a "\${STAGE_DIR}/frontend/." "\${REMOTE_ROOT}/frontend/"

rm -rf "\${REMOTE_ROOT}/user-frontend"
mkdir -p "\${REMOTE_ROOT}/user-frontend"
cp -a "\${STAGE_DIR}/user-frontend/." "\${REMOTE_ROOT}/user-frontend/"

if [[ -f "\${STAGE_DIR}/.gitignore" ]]; then
  cp -a "\${STAGE_DIR}/.gitignore" "\${REMOTE_ROOT}/.gitignore"
fi

rm -rf "\${REMOTE_LINK}"
ln -s "\${REMOTE_ROOT}" "\${REMOTE_LINK}"

cd "\${REMOTE_ROOT}/backend"
npm ci --omit=dev

cd "\${REMOTE_ROOT}/frontend"
npm ci
npm run build

cd "\${REMOTE_ROOT}/user-frontend"
npm ci
npm run build

if pm2 describe "\${PM2_APP_NAME}" >/dev/null 2>&1; then
  pm2 restart "\${PM2_APP_NAME}"
else
  cd "\${REMOTE_LINK}/backend"
  NODE_ENV=production pm2 start src/server.js --name "\${PM2_APP_NAME}" --cwd "\${REMOTE_LINK}/backend"
fi

pm2 save >/dev/null
if command -v curl >/dev/null 2>&1; then
  curl -fsS "http://127.0.0.1:\${BACKEND_PORT}/health" >/dev/null
fi
EOF

generate_backend_env "${BACKEND_ENV_PATH}"

echo "Creating deploy bundle..."
(
  cd "${SCRIPT_DIR}"
  tar -czf "${ARCHIVE_PATH}" \
    --exclude='.git' \
    --exclude='.github' \
    --exclude='tmp' \
    --exclude='desktop.ini' \
    --exclude='*.log' \
    --exclude='*.tgz' \
    --exclude='backend/node_modules' \
    --exclude='backend/data' \
    --exclude='backend/.env' \
    --exclude='frontend/node_modules' \
    --exclude='frontend/dist' \
    --exclude='user-frontend/node_modules' \
    --exclude='user-frontend/dist' \
    backend frontend user-frontend .gitignore
)

echo "Uploading bundle to ${SSH_TARGET}..."
scp "${SCP_OPTS[@]}" "${ARCHIVE_PATH}" "${SSH_TARGET}:${REMOTE_ARCHIVE}"
scp "${SCP_OPTS[@]}" "${BACKEND_ENV_PATH}" "${SSH_TARGET}:${REMOTE_ENV}"
scp "${SCP_OPTS[@]}" "${TEMP_DIR}/remote-deploy.sh" "${SSH_TARGET}:~/deploy_jmms_remote.sh"

echo "Running remote deploy..."
ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" 'bash ~/deploy_jmms_remote.sh'

if [[ "${VERIFY_AFTER_DEPLOY}" -eq 1 ]] && command -v curl >/dev/null 2>&1; then
  echo "Verifying public URLs..."
  curl -fsS "https://${PUBLIC_DOMAIN}/health" >/dev/null
  curl -fsS "https://${ADMIN_DOMAIN}/health" >/dev/null
fi

echo "Deploy complete."
echo "User frontend: https://${PUBLIC_DOMAIN}"
echo "Admin frontend: https://${ADMIN_DOMAIN}"
