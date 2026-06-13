# Servidor de Produção EC2 — Estado Atual (2026-06-13)

> Atualizado via análise direta do servidor. Fonte de verdade para qualquer IA que precise operar o servidor.

## Acesso

| Item | Valor |
|---|---|
| **Provedor** | AWS EC2 |
| **IP público** | `ec2-3-137-119-152.us-east-2.compute.amazonaws.com` |
| **Região** | `us-east-2` (Ohio) |
| **Usuário** | `ec2-user` |
| **Chave SSH** | `medtrack-system.pem` em `D:\PESSOAL\chamanoespeto-aws\` |
| **Domínio principal** | `janocaminho.com.br` / `www.janocaminho.com.br` |
| **Domínio legado** | `chamanoespeto.com.br` → redireciona 301 para `janocaminho.com.br` |

```bash
ssh -i "D:/PESSOAL/chamanoespeto-aws/medtrack-system.pem" ec2-user@ec2-3-137-119-152.us-east-2.compute.amazonaws.com
```

## Hardware / OS

| Item | Valor |
|---|---|
| **SO** | Amazon Linux 2023 |
| **Disco** | 30 GB (17 GB usados, 14 GB livres — 57%) |
| **RAM** | 1.9 GB total, ~847 MB usado, ~814 MB disponível |
| **Swap** | 2 GB file, 1.3 GB em uso (RAM está apertada!) |

## SSL / Certificados

| Domínio | Expiração | Status |
|---|---|---|
| `janocaminho.com.br` | 2026-08-17 | ✅ VÁLIDO (65 dias) |
| `chamanoespeto.com.br` | 2026-04-06 | ❌ EXPIRADO (não está em uso ativo) |

Renovar janocaminho.com.br antes de 17/08/2026: `sudo certbot renew`

## Nginx (Reverse Proxy)

```
Client → Nginx (:80 → redirect 301 → :443 SSL)
  ├── /           → frontend (:8080)
  ├── /api/       → backend (:4000)
  ├── /uploads/   → backend (:4000)
  └── /api/maps/  → apis (:5051)
```

**Config**: `/etc/nginx/conf.d/` (arquivos de conf)
**Redirects**: HTTP → HTTPS, chamanoespeto.com.br → janocaminho.com.br

## Docker Containers

| Container | Porta | Status | Imagem |
|---|---|---|---|
| `janocaminho-frontend` | 8080 | Up | GHCR janocaminho-frontend:main |
| `janocaminho-backend` | 4000 | Up | GHCR janocaminho-backend:main |
| `janocaminho-apis` | 5000 | Up | GHCR janocaminho-apis:main |
| `janocaminho-postgres` | 5432 | Up | postgres:16 |
| `janocaminho-redis` | 6379 | Up | redis:7-alpine (max 50mb LRU) |
| `janocaminho-pgadmin` | 5050 | Up | dpage/pgadmin4:8.13 |
| `janocaminho-face-worker` | 8000 (internal) | Up | GHCR janocaminho-face-worker:main |

**Código no servidor**: `~/EdEspetoHub` (branch `main`)
**Commit atual em produção**: `51d3200d feat(hub): add premium physics carousels`

## Docker Volumes

| Volume | Tipo |
|---|---|
| `edespetohub_postgres-data` | Dados PostgreSQL |
| `edespetohub_redis-data` | Dados Redis |
| `edespetohub_uploads_data` | Uploads de arquivos |

## Jobs / Cron (crontab do ec2-user)

### 1. Backup PostgreSQL diário (03:15 UTC)
```cron
15 3 * * * ... bash /home/ec2-user/bin/jnc-pg-backup-rotate.sh >> /home/ec2-user/pg-backup.log 2>&1
```
- Backup local + upload S3 (`jnc-db-backups-prod`)
- Retenção: 1 backup local, S3 com rotate
- Log: `/home/ec2-user/pg-backup.log`

### 2. Backup de configuração (02:15 UTC, a cada ~15 dias)
```cron
15 2 * * * ... sh /home/ec2-user/bin/jnc-config-backup.sh >> /home/ec2-user/config-backup.log 2>&1
```
- Backup de configs/SSM parameters para S3
- KEEP_DAYS=30, MIN_INTERVAL_HOURS=360 (~15 dias)
- Log: `/home/ec2-user/config-backup.log`

## Scripts de Operação

| Script | Localização | Função |
|---|---|---|
| `jnc-pg-backup-rotate.sh` | `~/bin/` | Backup PG + rotate + upload S3 |
| `jnc-config-backup.sh` | `~/bin/` | Backup configs + SSM + upload S3 |

## CI/CD

- **GitHub Actions**: `publish-ghcr.yml` (build + push Docker images to GHCR)
- **Deploy**: `deploy-production.yml` (SSH + docker compose pull + restart)
- **Registry**: `ghcr.io/edmilsonfernandes/janocaminho-*`
- **Tag**: `main` (cada push em main gera novo build)

## Portas Expostas

| Porta | Serviço | Acesso |
|---|---|---|
| 80 | Nginx (HTTP → redirect HTTPS) | Público |
| 443 | Nginx (HTTPS) | Público |
| 4000 | Backend API | Público (via Nginx) |
| 5000 | BFF/APIs | Público (via Nginx :5051) |
| 5050 | pgAdmin | Público (⚠️ considerar restringir) |
| 5432 | PostgreSQL | Público (⚠️ SECURITY RISK!) |
| 6379 | Redis | Público (⚠️ SECURITY RISK!) |
| 8080 | Frontend | Público (via Nginx) |

## ⚠️ Alertas de Segurança

1. **PostgreSQL (5432) e Redis (6379) expostos publicamente** — deveriam ser acessíveis apenas internamente. Recomendado remover mapeamento de portas ou usar security group para restringir.
2. **pgAdmin (5050) exposto** — acessível sem VPN. Considerar restringir via security group.
3. **RAM baixa** — 1.3 GB de swap em uso. Monitorar necessidade de upgrade de instância.
4. **Disco 57%** — monitorar crescimento de uploads e backups.
5. **SSL chamanoespeto.com.br expirado** — não causa impacto mas deveria ser removido.

## Comandos Úteis

```bash
# Ver logs do backend
docker logs janocaminho-backend --tail 100 -f

# Reiniciar um container
docker restart janocaminho-backend

# Pull e redeploy (após CI)
cd ~/EdEspetoHub && docker compose pull && docker compose up -d

# Backup manual do Postgres
docker exec janocaminho-postgres pg_dump -U postgres espetinho > backup.sql

# Renovar SSL
sudo certbot renew

# Verificar saúde dos containers
docker ps --format "table {{.Names}}\t{{.Status}}"
```
