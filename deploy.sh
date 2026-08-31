#!/usr/bin/env bash
set -euo pipefail

REMOTE="arschwasser-deploy"
REMOTE_DIR="/home/deploy/arschwasser"
SERVICE="arschwasser"

echo "==> Deploying to $REMOTE:$REMOTE_DIR"

ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
cd "$REMOTE_DIR"

echo "==> Pulling latest changes"
git pull

echo "==> Enabling corepack"
corepack enable

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Running migrations"
pnpm exec prisma migrate deploy

echo "==> Building"
pnpm build

echo "==> Restarting $SERVICE"
sudo systemctl restart "$SERVICE"
EOF

echo "==> Done"
