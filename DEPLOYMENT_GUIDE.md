# Deployment Guide (Generic)

This document describes how to deploy the **AI Interviewer** application in a standard Docker Compose or Linux server environment.

---

## 1. Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local builds)
- Google AI Studio API Key (with Gemini 3.8 Live & Gemini 3.8 Flash access)
- Reverse proxy (Nginx, Apache2, Caddy, or Cloudflare Tunnel)

---

## 2. Environment Configuration
Copy the template and fill in your secrets:
```bash
cp .env.example .env
```

Ensure the following variables are configured:
```ini
DATABASE_URL="file:/app/prisma/prod.db"
GEMINI_API_KEY="your_api_key_here"
BETTER_AUTH_SECRET="secure_random_string_min_32_characters"
BETTER_AUTH_URL="https://yourdomain.com/tools/ai-interviewer"
NEXT_PUBLIC_RP_NAME="AI Interviewer"
NEXT_PUBLIC_RP_ID="yourdomain.com"
BASE_PATH="/tools/ai-interviewer"
PORT="3000"
NODE_ENV="production"
```

---

## 3. Docker Compose Deployment
```bash
# Build and start container
docker compose up -d --build

# View logs
docker compose logs -f
```

---

## 4. Reverse Proxy Setup (Apache / Nginx)

### WebSocket Support
Gemini 3.8 Live requires bidirectional WebSocket proxying on `/api/live-interview`.

#### Apache2 Example:
```apache
RewriteEngine On
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule ^/tools/ai-interviewer/api/live-interview(.*) ws://127.0.0.1:3080/tools/ai-interviewer/api/live-interview$1 [P,L]

<Location /tools/ai-interviewer/>
    ProxyPass http://127.0.0.1:3080/tools/ai-interviewer/
    ProxyPassReverse http://127.0.0.1:3080/tools/ai-interviewer/
</Location>
```

#### Nginx Example:
```nginx
location /tools/ai-interviewer/api/live-interview {
    proxy_pass http://127.0.0.1:3080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 900s;
}

location /tools/ai-interviewer/ {
    proxy_pass http://127.0.0.1:3080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## 5. Health Check
```bash
curl -I http://127.0.0.1:3080/tools/ai-interviewer/
```
Verify that HTTP 200 is returned.
