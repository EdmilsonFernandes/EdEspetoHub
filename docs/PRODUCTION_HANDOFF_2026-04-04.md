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
- `backend/.env.docker`
- `.env.prod`
- `backend/keys/firebase-adminsdk.json`
- `docker-compose.yml`
- `docker-compose.prod.yml`

## 3) Automated Backup Script (Config + Keys)

Script:
- `scripts/backup-config.sh`

What it does:
- Creates timestamped tar.gz backup with critical runtime config.
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

## 4) Recommended Cron (Daily)

```bash
( crontab -l 2>/dev/null | grep -v 'backup-config.sh' ; \
  echo '15 2 * * * BACKUP_DIR=/var/backups/chamanoespeto/config KEEP_DAYS=30 sh /home/ec2-user/EdEspetoHub/scripts/backup-config.sh >> /var/log/config-backup.log 2>&1' \
) | crontab -
```

Validate:

```bash
crontab -l
tail -n 50 /var/log/config-backup.log
ls -lah /var/backups/chamanoespeto/config
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
cp /tmp/restore-config/config-*/backend/.env.docker ~/EdEspetoHub/backend/.env.docker
cp /tmp/restore-config/config-*/.env.prod ~/EdEspetoHub/.env.prod
cp /tmp/restore-config/config-*/backend/keys/firebase-adminsdk.json ~/EdEspetoHub/backend/keys/firebase-adminsdk.json
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

