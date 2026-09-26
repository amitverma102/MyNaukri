#!/bin/bash
set -e

DOMAIN="edukey360.com"
WWW_DOMAIN="www.edukey360.com"
EMAIL="support@edukey360.com"

echo "=================================================="
echo " Setting up Let's Encrypt SSL for $DOMAIN "
echo "=================================================="

# 1. Install Certbot
apt-get update -y
apt-get install -y certbot

# 2. Stop frontend temporarily to complete HTTP-01 challenge on port 80
echo "Obtaining SSL certificates..."
docker stop mynaukri-frontend || true

certbot certonly --standalone \
    -d $DOMAIN -d $WWW_DOMAIN \
    --agree-tos --non-interactive \
    --email $EMAIL \
    --preferred-challenges http

# 3. Configure Nginx with SSL & HTTPS redirect
echo "Configuring Nginx for HTTPS..."
cat << 'EOF' > /opt/mynaukri/ClientApp/nginx.conf
server {
    listen 80;
    server_name edukey360.com www.edukey360.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name edukey360.com www.edukey360.com;

    ssl_certificate /etc/letsencrypt/live/edukey360.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/edukey360.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /uploads/ {
        proxy_pass http://backend:8080/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF

# 4. Restart Frontend container with SSL enabled
echo "Rebuilding and restarting frontend container..."
cd /opt/mynaukri
docker compose -f docker-compose.prod.yml up -d --build frontend

# 5. Setup automated cron renewal
echo "Configuring automatic certificate renewal..."
(crontab -l 2>/dev/null | grep -v certbot; echo "0 3 * * * certbot renew --quiet && cd /opt/mynaukri && docker compose -f docker-compose.prod.yml restart frontend") | crontab -

echo "=================================================="
echo " SSL Setup Complete! https://$DOMAIN is live. "
echo "=================================================="
