# Deployment — https://meridian.atheer.tn

Meridian runs on the shared OVH VPS (`vps-73ab5292`, Debian 12, `51.91.96.179`) the same way as the other apps there:
a Docker Compose project with its own MongoDB, bound to a localhost port, behind the host's Nginx + Certbot.

```
meridian.atheer.tn ──▶ host Nginx (TLS) ──▶ 127.0.0.1:8086 ──▶ [meridian] app (API + web/dist) ──▶ [meridian] mongo:7
```

| What | Where on the server |
|---|---|
| Source (synced by CI) | `/home/debian/apps/meridian` |
| Secrets (never in git, never overwritten) | `/home/debian/apps/meridian-secrets/meridian.env` |
| Compose project | `docker compose -p meridian -f deploy/docker-compose.server.yml` |
| Data | volumes `meridian_mongo_data`, `meridian_uploads` |
| Nginx site | `/etc/nginx/sites-available/meridian` |

## CI/CD (`.github/workflows/deploy.yml`)

Every push and pull request: `npm ci` → typecheck → integration tests (MongoDB service container) → build.
Pushes to `main` then rsync the source to the server, `docker compose up -d --build` (image tagged with the commit),
and check `/api/health` locally and over HTTPS.

GitHub → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `VPS_HOST` | `51.91.96.179` |
| `VPS_USER` | `debian` |
| `VPS_SSH_KEY` | private key of a deploy-only key pair whose public key is in `~debian/.ssh/authorized_keys` |

## One-time server setup

```bash
mkdir -p ~/apps/meridian ~/apps/meridian-secrets && chmod 700 ~/apps/meridian-secrets
```

`~/apps/meridian-secrets/meridian.env` (`chmod 600`):

```ini
NODE_ENV=production
JWT_SECRET=<openssl rand -base64 48>
COOKIE_SECURE=true
TRUST_PROXY=true
CORS_ORIGIN=https://meridian.atheer.tn
SEED_ADMIN_EMAIL=admin@meridian.atheer.tn
SEED_ADMIN_PASSWORD="<strong password>"
```

`MONGODB_URI` and `PORT` are set by the compose file.

Nginx site (`/etc/nginx/sites-available/meridian`, enabled with a symlink in `sites-enabled`), then `sudo certbot --nginx -d meridian.atheer.tn`:

```nginx
server {
    listen 80;
    server_name meridian.atheer.tn;
    client_max_body_size 60m;   # lesson documents are up to 50 MB

    location / {
        proxy_pass http://127.0.0.1:8086;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

After the first deploy, seed once (idempotent; `--reset` is refused in production):

```bash
docker compose -p meridian -f ~/apps/meridian/deploy/docker-compose.server.yml exec app node dist/seed/index.js
```

## Operations

```bash
cd ~/apps/meridian && export APP_PORT=8086 API_ENV_FILE=~/apps/meridian-secrets/meridian.env
docker compose -p meridian -f deploy/docker-compose.server.yml ps
docker compose -p meridian -f deploy/docker-compose.server.yml logs -f app
docker compose -p meridian -f deploy/docker-compose.server.yml restart app

# Backup the database
docker compose -p meridian -f deploy/docker-compose.server.yml exec -T mongo mongodump --archive --gzip > meridian-$(date +%F).archive.gz
```
