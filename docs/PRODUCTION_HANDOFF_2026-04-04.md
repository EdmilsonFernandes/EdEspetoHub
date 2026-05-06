# Production Handoff (2026-04-04)

Author: Edmilson Fernandes  
Scope: API, Frontend, Hub, Mobile APK, Push Notifications, Production Ops

## 1) What Was Implemented

### 1.1 Customer Push (Mobile + Anonymous)
- Added anonymous customer push support (guest flow).
- Order lifecycle now dispatches push updates for guest users.
- Push permission UX improved inside mobile app (native re-enable banner).
- Fixed guest id consistency (`jnk_mobile_push_guest_id`) to avoid token mismatch.
- Push notification body now includes store name.

### 1.2 FCM Migration
- Migrated push sender to Firebase Cloud Messaging HTTP v1.
- API now supports credentials via:
  - `FCM_PROJECT_ID`
  - `FCM_SERVICE_ACCOUNT_PATH`
  - `FCM_SERVICE_ACCOUNT_JSON`
- Docker now mounts key directory:
  - host: `backend/keys`
  - container: `/app/keys` (read-only)

### 1.3 Super Admin Features
- Added global push broadcast endpoint for SUPER_ADMIN.
- Added Super Admin UI tab for sending global push notifications.

### 1.4 Hub / Marketplace
- Premium UI refinements and responsive adjustments.
- Sponsored highlight flow and ordering behavior refined.
- Bottom navigation and visual consistency improved.

### 1.5 Operational Hardening
- Added git ignore rules for sensitive local key material (`backend/keys`, `*.pem`, `*.p12`).
- Deploy pipeline cleanup improved to avoid stale build/cache growth.

## 2) Critical Runtime Files To Protect

These files must be backed up after each relevant change:
- `backend/.env`
- `backend/.env.docker`
- `apis/.env.docker`
- `server/.env.docker`
- `.env.prod`
- `.env.prod.secrets` (if present)
- `frontend/.env.production`
- `backend/keys/firebase-adminsdk.json`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- SSM parameters referenced by the deploy envs (for example `SSM_PARAMETER_NAME=/chamanoespeto/prod`)

## 3) Automated Backup Script (Config + Keys)

Script:
- `scripts/backup-config.sh`

What it does:
- Creates timestamped tar.gz backup with critical runtime config.
- Includes the effective env files used on the server when they exist.
- Can export decrypted SSM parameters referenced by the deploy env files.
- Can upload the archive to a private S3 bucket with server-side encryption.
- Adds metadata and checksums.
- Keeps backups with retention (`KEEP_DAYS`, default `30`).

Run manually:

```bash
cd ~/EdEspetoHub
sh scripts/backup-config.sh
```

Custom destination/retention:

```bash
BACKUP_DIR=/var/backups/chamanoespeto/config KEEP_DAYS=60 sh scripts/backup-config.sh
```

Upload to private S3 bucket and require SSM export:

```bash
BACKUP_DIR=/var/backups/chamanoespeto/config \
KEEP_DAYS=60 \
CONFIG_BACKUP_S3_BUCKET=jnc-config-backups-prod-222984221398 \
CONFIG_BACKUP_S3_PREFIX=config/runtime \
CONFIG_BACKUP_SSM_EXPORT_MODE=required \
sh scripts/backup-config.sh
```

## 4) Recommended Cron (Daily)

```bash
( crontab -l 2>/dev/null | grep -v 'backup-config.sh' ; \
  echo '15 2 * * * BACKUP_DIR=/var/backups/chamanoespeto/config KEEP_DAYS=30 CONFIG_BACKUP_S3_BUCKET=jnc-config-backups-prod-222984221398 CONFIG_BACKUP_S3_PREFIX=config/runtime CONFIG_BACKUP_SSM_EXPORT_MODE=required sh /home/ec2-user/EdEspetoHub/scripts/backup-config.sh >> /var/log/config-backup.log 2>&1' \
) | crontab -
```

Validate:

```bash
crontab -l
tail -n 50 /var/log/config-backup.log
ls -lah /var/backups/chamanoespeto/config
aws s3 ls s3://jnc-config-backups-prod-222984221398/config/runtime/ | tail
```

## 5) Fast Restore Procedure

1. Pick backup file:

```bash
ls -1t /var/backups/chamanoespeto/config/config-backup-*.tar.gz | head -n 1
```

2. Extract to temp:

```bash
mkdir -p /tmp/restore-config
tar -xzf /var/backups/chamanoespeto/config/config-backup-YYYYMMDDTHHMMSSZ.tar.gz -C /tmp/restore-config
```

3. Restore files:

```bash
RESTORE_DIR="$(find /tmp/restore-config -maxdepth 1 -type d -name 'config-*' | head -n 1)"
cp "$RESTORE_DIR/backend/.env.docker" ~/EdEspetoHub/backend/.env.docker
cp "$RESTORE_DIR/apis/.env.docker" ~/EdEspetoHub/apis/.env.docker
cp "$RESTORE_DIR/.env.prod" ~/EdEspetoHub/.env.prod
cp "$RESTORE_DIR/backend/keys/firebase-adminsdk.json" ~/EdEspetoHub/backend/keys/firebase-adminsdk.json
test -f "$RESTORE_DIR/backend/.env" && cp "$RESTORE_DIR/backend/.env" ~/EdEspetoHub/backend/.env || true
test -f "$RESTORE_DIR/server/.env.docker" && cp "$RESTORE_DIR/server/.env.docker" ~/EdEspetoHub/server/.env.docker || true
test -f "$RESTORE_DIR/frontend/.env.production" && cp "$RESTORE_DIR/frontend/.env.production" ~/EdEspetoHub/frontend/.env.production || true
test -f "$RESTORE_DIR/.env.prod.secrets" && cp "$RESTORE_DIR/.env.prod.secrets" ~/EdEspetoHub/.env.prod.secrets || true
```

4. Recreate API container:

```bash
cd ~/EdEspetoHub
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps --force-recreate api
```

5. Verify env/key inside container:

```bash
docker exec janocaminho-backend sh -lc 'echo SSM_OVERRIDE=$SSM_OVERRIDE FCM_PROJECT_ID=$FCM_PROJECT_ID FCM_SERVICE_ACCOUNT_PATH=$FCM_SERVICE_ACCOUNT_PATH && ls -lah /app/keys/firebase-adminsdk.json'
```

## 6) Important Notes

- If SSM is active and overriding values, local env may be ignored.
- For local env precedence in current setup, `SSM_OVERRIDE=false` is required in `backend/.env.docker`.
- Never commit real secrets (`.env`, service account JSON, keys).
