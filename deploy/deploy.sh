#!/usr/bin/env bash
# Forma: полный деплой одной командой. Повторный запуск безопасен.
set -uo pipefail
APP=/opt/forma
DOMAIN=forma.89-208-113-147.sslip.io
PORT=8107
REPORT=$APP/deploy/reports/deploy.txt
mkdir -p "$APP/deploy/reports"
exec > >(tee "$REPORT") 2>&1
ok() { echo "OK   $*"; }
bad() { echo "FAIL $*"; FAILED=1; }
FAILED=0
echo "Forma deploy $(date -u '+%Y-%m-%d %H:%M UTC'), commit $(git -C $APP rev-parse --short HEAD)"

# 1. Пакеты
NEED=""
for p in python3-venv postgresql nginx certbot openssl; do dpkg -s "$p" >/dev/null 2>&1 || NEED="$NEED $p"; done
if [ -n "$NEED" ]; then
  DEBIAN_FRONTEND=noninteractive apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq $NEED >/dev/null && ok "installed:$NEED" || bad "apt install:$NEED"
else ok "packages present"; fi

# 2. Настройки и база
mkdir -p /etc/forma /var/lib/forma
id forma >/dev/null 2>&1 || useradd --system --home /var/lib/forma --shell /usr/sbin/nologin forma
chown forma:forma /var/lib/forma
if [ ! -f /etc/forma/env ]; then
  PW=$(openssl rand -hex 16)
  printf 'DATABASE_URL=postgresql://forma:%s@127.0.0.1:5432/forma\nDATA_DIR=/var/lib/forma\nVAPID_SUB=mailto:admin@%s\n' "$PW" "$DOMAIN" > /etc/forma/env
  chmod 600 /etc/forma/env
fi
PW=$(sed -n 's#^DATABASE_URL=postgresql://forma:\([^@]*\)@.*#\1#p' /etc/forma/env)
systemctl enable --now postgresql >/dev/null 2>&1
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='forma'" | grep -q 1; then
  sudo -u postgres psql -qc "ALTER ROLE forma WITH LOGIN PASSWORD '$PW'" && ok "db role"
else
  sudo -u postgres psql -qc "CREATE ROLE forma WITH LOGIN PASSWORD '$PW'" && ok "db role created"
fi
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='forma'" | grep -q 1 || sudo -u postgres createdb -O forma forma
ok "database"

# 3. Бэкенд
cd "$APP/backend"
[ -x .venv/bin/python ] || python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip >/dev/null 2>&1
.venv/bin/pip install -q -r requirements.txt && ok "python deps" || bad "python deps"
cat > /etc/systemd/system/forma.service <<UNIT
[Unit]
Description=Forma API
After=network.target postgresql.service

[Service]
User=forma
WorkingDirectory=$APP/backend
EnvironmentFile=/etc/forma/env
ExecStart=$APP/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port $PORT --proxy-headers
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable forma >/dev/null 2>&1
systemctl restart forma
sleep 3
systemctl is-active --quiet forma && ok "api service" || { bad "api service"; journalctl -u forma -n 30 --no-pager; }

# 4. Nginx и HTTPS
CERT=/etc/letsencrypt/live/$DOMAIN/fullchain.pem
write_nginx() {
  if [ -f "$CERT" ]; then
    LISTEN="listen 443 ssl http2; listen [::]:443 ssl http2; ssl_certificate $CERT; ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;"
    REDIRECT="server { listen 80; listen [::]:80; server_name $DOMAIN; location /.well-known/acme-challenge/ { root $APP/frontend/dist; } location / { return 301 https://\$host\$request_uri; } }"
  else
    LISTEN="listen 80; listen [::]:80;"
    REDIRECT=""
  fi
  cat > /etc/nginx/conf.d/forma.conf <<NGX
$REDIRECT
server {
  $LISTEN
  server_name $DOMAIN;
  root $APP/frontend/dist;
  client_max_body_size 4m;
  gzip on; gzip_types text/css application/javascript application/json image/svg+xml application/manifest+json;
  location /api/ { proxy_pass http://127.0.0.1:$PORT; proxy_set_header Host \$host; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; }
  location /.well-known/acme-challenge/ { root $APP/frontend/dist; }
  location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; try_files \$uri =404; }
  location /media/ { add_header Cache-Control "public, max-age=604800"; try_files \$uri =404; }
  location ~ ^/(sw\.js|manifest\.webmanifest|index\.html)$ { add_header Cache-Control "no-cache, must-revalidate"; try_files \$uri =404; }
  location / { add_header Cache-Control "no-cache, must-revalidate"; try_files \$uri /index.html; }
}
NGX
}
write_nginx
nginx -t >/dev/null 2>&1 && systemctl reload nginx && ok "nginx" || { bad "nginx config"; nginx -t; }
if [ ! -f "$CERT" ]; then
  certbot certonly --webroot -w "$APP/frontend/dist" -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email >/dev/null 2>&1 && ok "certificate issued" || bad "certificate"
  write_nginx; nginx -t >/dev/null 2>&1 && systemctl reload nginx
fi
[ -f /etc/letsencrypt/renewal-hooks/deploy/forma.sh ] || { mkdir -p /etc/letsencrypt/renewal-hooks/deploy; printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/forma.sh; chmod +x /etc/letsencrypt/renewal-hooks/deploy/forma.sh; }

# 5. Проверки снаружи
sleep 1
H=$(curl -s -m 10 "https://$DOMAIN/api/health"); echo "$H" | grep -q '"ok":true' && ok "https api: $H" || bad "https api: $H"
C=$(curl -sI -m 10 "https://$DOMAIN/" | tr -d '\r' | grep -i '^cache-control' ); echo "$C" | grep -qi no-cache && ok "index $C" || bad "index cache header: $C"
S=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "https://$DOMAIN/sw.js"); [ "$S" = 200 ] && ok "service worker 200" || bad "service worker $S"
V=$(grep -o 'index-[A-Za-z0-9_-]*\.js' "$APP/frontend/dist/index.html" | head -1); echo "build $V"
[ "$FAILED" = 0 ] && echo "RESULT: OK https://$DOMAIN" || echo "RESULT: ERRORS"

# 6. Отчёт в git
cd "$APP"
git config user.name "forma-server"; git config user.email "server@forma.local"
git add deploy/reports/deploy.txt
git commit -qm "deploy report $(date -u +%F_%H%M)" >/dev/null 2>&1
# никогда не спрашивать логин/пароль: без доступа просто пропускаем отправку отчёта
export GIT_TERMINAL_PROMPT=0
timeout 60 git push -q origin HEAD:main >/dev/null 2>&1 || { timeout 60 git pull -q --rebase origin main >/dev/null 2>&1 && timeout 60 git push -q origin HEAD:main >/dev/null 2>&1; } || echo "report: push skipped (no git access)"
