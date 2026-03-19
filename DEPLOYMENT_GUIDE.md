# OneForm Unified Platform — Deployment Guide
> Complete deployment instructions for production environment
> Last updated: 2026-03-19

---

## Critical: Fix Login Issue FIRST

### Issue
Live website at https://indianform.com cannot login because frontend is calling `http://localhost:4000` instead of `https://api.indianform.com`.

### Solution

#### 1. Add VITE_API_URL to Cloudflare Pages Environment Variables

**⚠️ MOST IMPORTANT FIX**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to: **Workers & Pages** → **oneform-unified-web** → **Settings** → **Environment variables**
3. Under **Production** tab, click **Add variable**:
   - **Variable name**: `VITE_API_URL`
   - **Value**: `https://api.indianform.com`
4. Click **Save**
5. Trigger a new deployment by pushing to main branch or clicking **Redeploy** in Deployments tab

**Why this is needed**: Vite requires environment variables to be set at **build time**. The GitHub Actions workflow sets it during the build step, but if Cloudflare Pages rebuilds using its native git integration, it won't have access to GitHub secrets. Setting it in CF Pages ensures it's available regardless of how the build is triggered.

#### 2. Update ALLOWED_ORIGINS on Hetzner API

SSH to Hetzner server:
```bash
ssh dkumar@135.181.112.160
cd /home/dkumar/oneform/oneform-unified/apps/api
nano .env
```

Update the `ALLOWED_ORIGINS` line:
```env
ALLOWED_ORIGINS=https://indianform.com,https://www.indianform.com,http://localhost:3000
```

Restart the API:
```bash
pm2 restart oneform-api
pm2 logs oneform-api --lines 50
```

#### 3. Disable Cloudflare Pages Native Git Integration

**IMPORTANT**: To prevent duplicate deploys and ensure GitHub Actions is the ONLY deploy method:

1. Go to **Workers & Pages** → **oneform-unified-web** → **Settings** → **Builds & deployments**
2. Scroll to **Git integration**
3. Click **Disconnect** next to the repository

This ensures only the GitHub Actions `deploy.yml` workflow can deploy, which has proper environment variables configured.

#### 4. Verify GitHub Repository Secret

Ensure the secret is set in GitHub:

1. Go to: https://github.com/DeepakOla/oneform-unified/settings/secrets/actions
2. Verify `VITE_API_URL` exists with value: `https://api.indianform.com`
3. If not present, click **New repository secret** and add it

---

## Infrastructure Setup

### Hetzner Server (135.181.112.160)

#### PostgreSQL 17 (Port 5433)
```bash
# ⚠️ SECURITY FIX NEEDED: Currently bound to 0.0.0.0 (exposed to internet)
# Should be bound to 127.0.0.1 only

# Step 1: Stop and remove current container
docker stop oneform-postgres
docker rm oneform-postgres

# Step 2: Recreate with localhost-only binding
docker run -d \
  --name oneform-postgres \
  --restart unless-stopped \
  -p 127.0.0.1:5433:5432 \
  -e POSTGRES_DB=oneform \
  -e POSTGRES_USER=oneform \
  -e POSTGRES_PASSWORD="<SAME_PASSWORD_AS_BEFORE>" \
  -v oneform_postgres_data:/var/lib/postgresql/data \
  postgres:18-alpine

# Data is preserved in the volume
```

#### Redis 8 (Port 6380) - NOT YET CREATED
```bash
# Generate strong password
REDIS_PASSWORD=$(openssl rand -base64 32)
echo "Redis password: $REDIS_PASSWORD"
# Save this password in .env as REDIS_URL

docker run -d \
  --name oneform-redis \
  --restart unless-stopped \
  -p 127.0.0.1:6380:6379 \
  -v oneform_redis_data:/data \
  redis:8-alpine \
  redis-server --requirepass "$REDIS_PASSWORD" --appendonly yes --save 60 1000

# Test connection
docker exec -it oneform-redis redis-cli -a "$REDIS_PASSWORD" PING
# Should return: PONG
```

Update `apps/api/.env` on Hetzner:
```env
REDIS_URL=redis://:PASSWORD_HERE@localhost:6380
```

Restart API:
```bash
pm2 restart oneform-api
```

#### OneForm API (Port 4000 via PM2)

##### Initial Deployment
```bash
cd /home/dkumar/oneform/oneform-unified
git pull origin main
pnpm install --frozen-lockfile

# Build API
pnpm --filter @oneform/api run build

# Start with PM2
pm2 start apps/api/dist/index.js --name oneform-api
pm2 save

# View logs
pm2 logs oneform-api
```

##### Subsequent Deployments
```bash
cd /home/dkumar/oneform/oneform-unified
git pull origin main
pnpm install --frozen-lockfile
pnpm --filter @oneform/api run build
pm2 restart oneform-api
pm2 logs oneform-api --lines 50
```

##### Environment Variables (apps/api/.env)
```env
# Database
DATABASE_URL="postgresql://oneform:PASSWORD@localhost:5433/oneform"

# Redis
REDIS_URL="redis://:PASSWORD@localhost:6380"

# JWT
JWT_ACCESS_SECRET="<openssl rand -hex 32>"

# Encryption (AES-256-GCM)
ENCRYPTION_KEK="<openssl rand -base64 32>"
ENCRYPTION_KEK_VERSION="1"

# Server
NODE_ENV="production"
PORT="4000"
ALLOWED_ORIGINS="https://indianform.com,https://www.indianform.com,http://localhost:3000"

# Razorpay
RAZORPAY_KEY_ID="<rzp_live_...>"
RAZORPAY_KEY_SECRET="<your_secret>"

# Cloudflare R2
R2_ACCOUNT_ID="528ce312cefbd072120fc9a83d0a62de"
R2_ACCESS_KEY_ID="<your_r2_access_key>"
R2_SECRET_ACCESS_KEY="<your_r2_secret>"
R2_BUCKET_NAME="oneform-documents"
R2_PUBLIC_URL="https://documents.indianform.com"

# Scrapling (Phase 3)
SCRAPLING_URL="http://localhost:8001"

# OCR Ensemble
OCR_ENSEMBLE_URL="http://localhost:8004"
```

---

## Cloudflare Configuration

### Pages Project: oneform-unified-web

#### Environment Variables (Production)
Set in CF Dashboard → Workers & Pages → oneform-unified-web → Settings → Environment variables:

| Variable | Value | Purpose |
|---|---|---|
| `VITE_API_URL` | `https://api.indianform.com` | **CRITICAL** - API endpoint |
| `NODE_VERSION` | `22` | Node.js version for build |

#### Build Configuration
- **Framework preset**: Vite
- **Build command**: `pnpm run build --filter @oneform/web`
- **Build output directory**: `apps/web/dist`
- **Root directory**: `/`

**IMPORTANT**: Disable native git integration (see step 3 above). Use GitHub Actions for all deployments.

### R2 Bucket: oneform-documents

Already created. Used for document storage (Aadhaar, PAN, etc.).

Access via API using environment variables listed above.

### Tunnel Configuration

Tunnel ID: `64a6bce3-1045-41a9-8baa-6ad8bfd86ee0`

#### Public Hostnames
Set in CF Dashboard → Networks → Tunnels → [Tunnel] → Public Hostname:

| Subdomain | Domain | Service | Purpose |
|---|---|---|---|
| `api` | `indianform.com` | `http://localhost:4000` | OneForm API |

### DNS Records

Set in CF Dashboard → indianform.com → DNS:

| Type | Name | Content | Proxy Status |
|---|---|---|---|
| CNAME | `@` | `oneform-unified-web.pages.dev` | Proxied |
| CNAME | `www` | `oneform-unified-web.pages.dev` | Proxied |
| CNAME | `api` | `64a6bce3-1045-41a9-8baa-6ad8bfd86ee0.cfargotunnel.com` | Proxied |

---

## GitHub Actions

### Secrets Required

Set in GitHub: https://github.com/DeepakOla/oneform-unified/settings/secrets/actions

| Secret Name | Value | Purpose |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | `<cf_api_token>` | Wrangler Pages deploy |
| `CLOUDFLARE_ACCOUNT_ID` | `528ce312cefbd072120fc9a83d0a62de` | CF account |
| `VITE_API_URL` | `https://api.indianform.com` | Frontend API URL |

### Workflows

#### `.github/workflows/ci.yml`
- Runs on: Push to any branch, PRs
- Purpose: Type-check, lint, build
- Does NOT deploy

#### `.github/workflows/deploy.yml`
- Runs on: Push to `main` branch
- Purpose: Build frontend → Deploy to CF Pages
- Sets `VITE_API_URL` at build time

---

## Phase 3: Scrapling Microservice (Port 8001)

### Docker Setup (NOT YET BUILT)

Create `apps/scrapling/Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers
RUN playwright install --with-deps chromium

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

Build and run:
```bash
cd /home/dkumar/oneform/oneform-unified/apps/scrapling
docker build -t oneform-scrapling .

docker run -d \
  --name oneform-scrapling \
  --restart unless-stopped \
  -p 127.0.0.1:8001:8001 \
  -e OLLAMA_URL=http://host.docker.internal:11435 \
  oneform-scrapling:latest
```

---

## Testing Deployment

### 1. Health Check
```bash
curl https://api.indianform.com/api/health
# Should return: {"status":"ok","service":"OneForm API",...}
```

### 2. CORS Test
```bash
curl -H "Origin: https://indianform.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://api.indianform.com/api/auth/login -v
# Should return: Access-Control-Allow-Origin: https://indianform.com
```

### 3. Login Test
Open browser console on https://indianform.com:
```javascript
fetch('https://api.indianform.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@indianform.com',
    password: 'Admin@1234'
  }),
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
```

Should return tokens if successful.

---

## Monitoring

### PM2
```bash
pm2 status                    # Check all processes
pm2 logs oneform-api          # Live logs
pm2 logs oneform-api --lines 100
pm2 monit                     # Real-time monitoring
```

### Logs Location
- **PM2 logs**: `~/.pm2/logs/`
- **API logs**: Output via pino (structured JSON)

### Database Monitoring
```bash
docker exec -it oneform-postgres psql -U oneform -d oneform
# Check table counts:
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'documents', COUNT(*) FROM documents;
```

---

## Rollback Procedure

### Frontend (Cloudflare Pages)
1. Go to CF Dashboard → Workers & Pages → oneform-unified-web → Deployments
2. Find the last working deployment
3. Click the **...** menu → **Rollback to this deployment**

### Backend (Hetzner API)
```bash
cd /home/dkumar/oneform/oneform-unified
git log --oneline -10  # Find last working commit
git checkout <commit-hash>
pnpm install --frozen-lockfile
pnpm --filter @oneform/api run build
pm2 restart oneform-api
```

---

## Security Checklist

- [ ] PostgreSQL bound to 127.0.0.1 only (NOT 0.0.0.0)
- [ ] Redis bound to 127.0.0.1 only with password
- [ ] HTTPS enforced for all domains
- [ ] CORS restricted to allowed origins only
- [ ] JWT secrets are strong (32+ bytes entropy)
- [ ] Encryption KEK is strong and backed up securely
- [ ] R2 bucket has proper access controls
- [ ] No secrets committed to git
- [ ] Cloudflare Tunnel uses token (no config.yml in git)

---

## Troubleshooting

### "Login button does nothing"
- Check browser console for CORS errors
- Verify `VITE_API_URL` is set in CF Pages environment variables
- Check API logs: `pm2 logs oneform-api | grep CORS`

### "Cannot connect to database"
- Check PostgreSQL is running: `docker ps | grep oneform-postgres`
- Verify port: `docker port oneform-postgres`
- Test connection: `docker exec -it oneform-postgres psql -U oneform -d oneform -c "SELECT 1;"`

### "Cannot connect to Redis"
- Check Redis is running: `docker ps | grep oneform-redis`
- Test: `docker exec -it oneform-redis redis-cli -a PASSWORD PING`

### "PM2 process keeps crashing"
```bash
pm2 logs oneform-api --lines 200  # Check error logs
pm2 restart oneform-api --update-env  # Reload env vars
```

---

## Backup Strategy

### Database Backups
```bash
# Daily automated backup (add to crontab)
0 2 * * * docker exec oneform-postgres pg_dump -U oneform oneform | gzip > /backups/oneform_$(date +\%Y\%m\%d).sql.gz

# Keep last 30 days
find /backups -name "oneform_*.sql.gz" -mtime +30 -delete
```

### Configuration Backups
```bash
# Backup .env file (encrypted)
tar czf oneform-env-$(date +%Y%m%d).tar.gz apps/api/.env
gpg -c oneform-env-$(date +%Y%m%d).tar.gz
rm oneform-env-$(date +%Y%m%d).tar.gz
# Store .gpg file in secure location
```

---

**Last Updated**: 2026-03-19 by Claude Code
