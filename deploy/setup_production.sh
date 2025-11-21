#!/usr/bin/env bash
set -euo pipefail

DOMAIN="microbet-linera.xyz"
EMAIL="egor4042007@gmail.com"
FRONT_PORT="5175"
WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
RUN_USER="${SUDO_USER:-$(whoami)}"

sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx

sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw --force enable

cd "$WORK_DIR"
npm install --no-audit --progress=false

cd "$WORK_DIR/orchestrator"
npm ci
cd "$WORK_DIR"

sudo mkdir -p /etc/microbet-linera
if [ ! -f "$WORK_DIR/.env.local" ]; then
  cat > "$WORK_DIR/.env.local" <<EOF
VITE_SUPABASE_URL=https://krvnqndokmyjbjonqauz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtydm5xbmRva215amJqb25xYXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMzA4NzcsImV4cCI6MjA3ODgwNjg3N30.wx6RRWcS65WOhbMVt2yoFLD52KmWfeoN4KpwZy0z954
VITE_BTC_CHAIN_ID=68113d35d4d4bccf55484cfdfe483955127740badafc80bdfc0621200f69004a
VITE_ETH_CHAIN_ID=4c5aee235b9d9ddf62f05d377fd832c718cb5939fc3545ba5ee2829b4c99dfb7
VITE_BTC_TARGET_OWNER=0x2ad49dbbf67ae272c06beadecbbd6f3ffd7f33fd7fdce45dc84e82ffd3184b0c
VITE_ETH_TARGET_OWNER=0xfa7b3b412e1b3dffc915df7ae7b7e59a0ebcbc084d8f71b724f35ec2ad872dc9
EOF
fi

if [ ! -f "/etc/microbet-linera/supabase.env" ]; then
  sudo bash -lc "cat > /etc/microbet-linera/supabase.env <<EOF
SUPABASE_URL=https://krvnqndokmyjbjonqauz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtydm5xbmRva215amJqb25xYXV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIzMDg3NywiZXhwIjoyMDc4ODA2ODc3fQ.ln4Zlz8bcF6nwc0Viii4aauG0Y-h7dET7VeHZgtTbYc
SUPABASE_DB_URL=
EOF"
fi

sudo bash -lc "cat > /etc/systemd/system/microbet-frontend.service <<EOF
[Unit]
Description=Microbet Linera Frontend
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORK_DIR
ExecStart=/usr/bin/npm run dev -- --port $FRONT_PORT --host 127.0.0.1
Restart=always
RestartSec=5
Environment=NODE_ENV=production
User=$RUN_USER
Group=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF"

sudo bash -lc "cat > /etc/systemd/system/microbet-orchestrator.service <<EOF
[Unit]
Description=Microbet Linera Orchestrator
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORK_DIR/orchestrator
ExecStart=/usr/bin/node orchestrator.js
Restart=always
RestartSec=5
User=$RUN_USER
Group=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF"

sudo bash -lc "cat > /etc/systemd/system/microbet-sync.service <<EOF
[Unit]
Description=Microbet Supabase Sync Daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORK_DIR/orchestrator
ExecStart=/usr/bin/node supabase-sync.js
EnvironmentFile=/etc/microbet-linera/supabase.env
Restart=always
RestartSec=5
User=$RUN_USER
Group=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable microbet-frontend.service microbet-orchestrator.service microbet-sync.service
sudo systemctl start microbet-frontend.service microbet-orchestrator.service microbet-sync.service

sudo tee "/etc/nginx/sites-available/$DOMAIN" >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$FRONT_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        add_header Cross-Origin-Opener-Policy "same-origin" always;
        add_header Cross-Origin-Embedder-Policy "require-corp" always;
    }
}
EOF

if [ -L "/etc/nginx/sites-enabled/$DOMAIN" ]; then
  sudo rm "/etc/nginx/sites-enabled/$DOMAIN"
fi
sudo ln -s "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
sudo nginx -t
sudo systemctl reload nginx

sudo certbot --nginx -n --agree-tos -m "$EMAIL" -d "$DOMAIN" --redirect
sudo systemctl reload nginx

echo "OK"