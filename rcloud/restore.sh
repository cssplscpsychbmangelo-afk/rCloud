#!/bin/bash
# Restores the dev environment after a sandbox reset (idempotent).
set -e
cd /home/user/rcloud
[ -x node_modules/.bin/next ] || npm install --silent
if ! command -v psql >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get update -qq && sudo apt-get install -y -qq postgresql
fi
sudo service postgresql start >/dev/null 2>&1 || true
sleep 2
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='rcloud'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE rcloud LOGIN PASSWORD 'rcloud_dev_password' CREATEDB;"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='rcloud'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE rcloud OWNER rcloud;"
[ -f .env ] || cat > .env << 'ENVEOF'
DATABASE_URL=postgres://rcloud:rcloud_dev_password@localhost:5432/rcloud
AUTH_SECRET=9f2c7d1a8b4e6f0c3a5d7e9b1c3f5a7d9e1b3c5d7f9a1c3e5d7b9f1a3c5e7d9b
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENVEOF
npm run db:push 2>&1 | tail -1
npm run db:seed 2>&1 | tail -2
npm run build > /tmp/build.log 2>&1 && echo BUILD_OK || tail -5 /tmp/build.log
