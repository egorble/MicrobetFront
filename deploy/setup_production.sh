#!/usr/bin/env bash
set -euo pipefail

# =========================
# CONFIG
# =========================
DOMAIN="microbet-linera.xyz"
EMAIL="egor4042007@gmail.com"
WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
RUN_USER="${SUDO_USER:-$(whoami)}"
BUILD_DIR="$WORK_DIR/build"

# =========================
# INSTALL SYSTEM PACKAGES
# =========================
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg ufw nodejs nginx certbot python3-certbot-nginx

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# =========================
# UFW FIREWALL
# =========================
sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw --force enable

# =========================
# INSTALL DEPENDENCIES
# =========================
cd "$WORK_DIR"
npm ci

cd "$WORK_DIR/orchestrator"
npm ci
cd "$WORK_DIR"


# =========================
# BUILD FRONTEND
# =========================
echo ">>> Building frontend"
cd "$WORK_DIR"
export VITE_POCKETBASE_URL="https://$DOMAIN:8090"
npm run build

sudo mkdir -p /var/www/$DOMAIN
sudo rm -rf /var/www/$DOMAIN/*
sudo cp -r "$WORK_DIR/dist/"* /var/www/$DOMAIN/

cd "$WORK_DIR/orchestrator"
node rounds-init.js

# =========================
# NGINX CONFIG
# =========================
sudo bash -c "cat > /etc/nginx/sites-available/$DOMAIN <<'NGINXEOF'
server {
    listen 80;
    server_name microbet-linera.xyz;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    root /var/www/microbet-linera.xyz;
    index index.html;

    add_header Cross-Origin-Opener-Policy \"same-origin\" always;
    add_header Cross-Origin-Embedder-Policy \"require-corp\" always;
    add_header Cross-Origin-Resource-Policy \"same-origin\" always;

    # Assets (JS/CSS/WASM) with CORS for Web Workers
    location /assets/ {
        root /var/www/microbet-linera.xyz;
        add_header Cross-Origin-Opener-Policy \"same-origin\" always;
        add_header Cross-Origin-Embedder-Policy \"require-corp\" always;
        add_header Cross-Origin-Resource-Policy \"same-origin\" always;
        add_header Access-Control-Allow-Origin \"*\" always;
        add_header Access-Control-Allow-Methods \"GET, HEAD, OPTIONS\" always;
        add_header Cache-Control \"public, max-age=31536000, immutable\";

        if (\$request_method = OPTIONS) {
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }

    # Static files
    location / {
        try_files \$uri /index.html;
    }

    # Orchestrator WebSocket proxy
    location /ws {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        add_header Cross-Origin-Opener-Policy \"same-origin\" always;
        add_header Cross-Origin-Embedder-Policy \"require-corp\" always;
        add_header Cross-Origin-Resource-Policy \"same-origin\" always;
    }
}

# PocketBase proxy (HTTP) -> local port 8091
server {
    listen 8090;
    server_name microbet-linera.xyz;

    location / {
        proxy_pass http://127.0.0.1:8091;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "*" always;

        if ($request_method = OPTIONS) {
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
}
NGINXEOF"

sudo ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
sudo nginx -t
sudo systemctl reload nginx

# =========================
# LET'S ENCRYPT SSL
# =========================
sudo certbot --nginx -n --agree-tos -m "$EMAIL" -d "$DOMAIN" --redirect

# Fix SSL config to preserve all headers
sudo bash -c "cat > /etc/nginx/sites-available/$DOMAIN <<'NGINXEOF'
server {
    listen 80;
    server_name microbet-linera.xyz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name microbet-linera.xyz;

    ssl_certificate /etc/letsencrypt/live/microbet-linera.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/microbet-linera.xyz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/microbet-linera.xyz;
    index index.html;

    # Critical headers for SharedArrayBuffer (WASM threads)
    add_header Cross-Origin-Opener-Policy \"same-origin\" always;
    add_header Cross-Origin-Embedder-Policy \"require-corp\" always;
    add_header Cross-Origin-Resource-Policy \"same-origin\" always;

    # Assets (JS/CSS/WASM) with CORS for Web Workers
    location /assets/ {
        root /var/www/microbet-linera.xyz;
        add_header Cross-Origin-Opener-Policy \"same-origin\" always;
        add_header Cross-Origin-Embedder-Policy \"require-corp\" always;
        add_header Cross-Origin-Resource-Policy \"same-origin\" always;
        add_header Access-Control-Allow-Origin \"*\" always;
        add_header Access-Control-Allow-Methods \"GET, HEAD, OPTIONS\" always;
        add_header Cache-Control \"public, max-age=31536000, immutable\";

        if (\$request_method = OPTIONS) {
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }

    # Static files
    location / {
        try_files \$uri /index.html;
    }

    # Orchestrator WebSocket proxy
    location /ws {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        add_header Cross-Origin-Opener-Policy \"same-origin\" always;
        add_header Cross-Origin-Embedder-Policy \"require-corp\" always;
        add_header Cross-Origin-Resource-Policy \"same-origin\" always;
    }
}

# PocketBase proxy (HTTPS:8090) -> local port 8091
server {
    listen 8090 ssl http2;
    server_name microbet-linera.xyz;

    ssl_certificate /etc/letsencrypt/live/microbet-linera.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/microbet-linera.xyz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:8091;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "*" always;

        if ($request_method = OPTIONS) {
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
}
NGINXEOF"

sudo nginx -t
sudo systemctl reload nginx

# =========================
# SYSTEMD SERVICES
# =========================
# Orchestrator
sudo bash -c "cat > /etc/systemd/system/microbet-orchestrator.service <<EOF
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

# Lottery Orchestrator
sudo bash -c "cat > /etc/systemd/system/microbet-lottery-orchestrator.service <<EOF
[Unit]
Description=Microbet Lottery Orchestrator
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORK_DIR/orchestrator
ExecStart=/usr/bin/node lottery-orchestrator.js
Restart=always
RestartSec=5
User=$RUN_USER
Group=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF"

# Supabase Sync
  sudo bash -c "cat > /etc/systemd/system/microbet-sync.service <<EOF
[Unit]
Description=Microbet Supabase Sync Daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORK_DIR/orchestrator
ExecStart=/usr/bin/node supabase-sync.js
Restart=always
RestartSec=5
User=$RUN_USER
Group=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF"

# Lottery Sync
  sudo bash -c "cat > /etc/systemd/system/microbet-lottery-sync.service <<EOF
[Unit]
Description=Microbet Lottery Sync Daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORK_DIR/orchestrator
ExecStart=/usr/bin/node lottery-supabase-sync.js
Restart=always
RestartSec=5
User=$RUN_USER
Group=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF"

# Leaderboard PocketBase Sync
sudo bash -c "cat > /etc/systemd/system/microbet-leaderboard-sync.service <<EOF
[Unit]
Description=Microbet Leaderboard PocketBase Sync
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORK_DIR/orchestrator
ExecStart=/usr/bin/node leaderboard-pb-sync.js
Restart=always
RestartSec=5
User=$RUN_USER
Group=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF"

# Lottery Bot tickets purchaser
sudo bash -c "cat > /etc/systemd/system/microbet-lottery-bot.service <<EOF
[Unit]
Description=Microbet Lottery Bot Buyer
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORK_DIR/orchestrator
ExecStart=/usr/bin/node bot-buy-tickets2.js
Restart=always
RestartSec=5
User=$RUN_USER
Group=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable --now microbet-orchestrator.service microbet-sync.service microbet-lottery-orchestrator.service microbet-lottery-sync.service microbet-leaderboard-sync.service microbet-lottery-bot.service

echo "====================================="
echo " Deployment completed successfully!  "
echo " Visit: https://$DOMAIN/"
echo "====================================="
