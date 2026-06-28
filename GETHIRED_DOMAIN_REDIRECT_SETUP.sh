#!/bin/bash
# Run this as root on the Linode server (139.162.11.242)
# Goal: gethiredonline.app becomes the canonical FE URL
#       web.gethiredonline.app -> 301 redirect to gethiredonline.app
#       api.gethiredonline.app stays unchanged
#
# Prerequisites: DNS A records for gethiredonline.app and www.gethiredonline.app
# must already be pointing to 139.162.11.242 BEFORE running the certbot step.
set -e

# ── Step 1: Write the new nginx config ─────────────────────────────────────

cat > /etc/nginx/sites-available/gethired <<'NGINX'
# ─────────────────────────────────────────────────────────────────────────────
# gethiredonline.app — canonical frontend (Angular SPA)
# ─────────────────────────────────────────────────────────────────────────────

# HTTP: redirect all to HTTPS canonical
server {
    listen 80;
    server_name gethiredonline.app www.gethiredonline.app;
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    location / {
        return 301 https://gethiredonline.app$request_uri;
    }
}

# HTTPS www -> canonical (no-www)
server {
    listen 443 ssl;
    server_name www.gethiredonline.app;
    ssl_certificate     /etc/letsencrypt/live/gethiredonline.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gethiredonline.app/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    return 301 https://gethiredonline.app$request_uri;
}

# HTTPS canonical — serve Angular SPA
server {
    listen 443 ssl;
    server_name gethiredonline.app;
    ssl_certificate     /etc/letsencrypt/live/gethiredonline.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gethiredonline.app/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/gethired/dist/get-hired;
    index index.html;

    # Angular router — serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# web.gethiredonline.app — legacy redirect to canonical
# ─────────────────────────────────────────────────────────────────────────────

server {
    listen 80;
    server_name web.gethiredonline.app;
    return 301 https://gethiredonline.app$request_uri;
}

server {
    listen 443 ssl;
    server_name web.gethiredonline.app;
    ssl_certificate     /etc/letsencrypt/live/web.gethiredonline.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/web.gethiredonline.app/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    return 301 https://gethiredonline.app$request_uri;
}

# ─────────────────────────────────────────────────────────────────────────────
# api.gethiredonline.app — Node/Express backend (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

server {
    listen 80;
    server_name api.gethiredonline.app;
    return 301 https://api.gethiredonline.app$request_uri;
}

server {
    listen 443 ssl;
    server_name api.gethiredonline.app;
    ssl_certificate     /etc/letsencrypt/live/api.gethiredonline.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.gethiredonline.app/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

# ── Step 2: Enable the site ─────────────────────────────────────────────────

ln -sf /etc/nginx/sites-available/gethired /etc/nginx/sites-enabled/gethired
# Remove old configs if they exist separately
rm -f /etc/nginx/sites-enabled/get-hired-FE 2>/dev/null || true

# ── Step 3: Test nginx config ───────────────────────────────────────────────

echo "--- Testing nginx config ---"
nginx -t

# ── Step 4: Get SSL cert for gethiredonline.app + www ──────────────────────
# NOTE: DNS A records for gethiredonline.app and www.gethiredonline.app
# MUST be pointing to this server BEFORE running this step.

echo "--- Getting SSL cert for gethiredonline.app ---"
certbot certonly --nginx \
  -d gethiredonline.app \
  -d www.gethiredonline.app \
  --non-interactive \
  --agree-tos \
  --email paul@moveup.app

# ── Step 5: Reload nginx ────────────────────────────────────────────────────

echo "--- Reloading nginx ---"
nginx -t && systemctl reload nginx

echo ""
echo "Done! Test these URLs:"
echo "  https://gethiredonline.app          -> should serve Angular app"
echo "  https://www.gethiredonline.app      -> should 301 to gethiredonline.app"
echo "  https://web.gethiredonline.app      -> should 301 to gethiredonline.app"
echo "  https://api.gethiredonline.app      -> should proxy to Node BE"
