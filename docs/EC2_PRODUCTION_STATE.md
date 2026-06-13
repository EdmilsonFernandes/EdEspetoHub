# Servidor de producao EC2 - estado auditado em 2026-06-13

> Inventario observado diretamente no servidor. Para incidentes, restore e
> migracao, use `docs/DISASTER_RECOVERY_RUNBOOK.md` como fonte principal.

## Acesso e capacidade

| Item | Valor observado |
|---|---|
| Instancia | `i-0655add58c3bce86a` |
| IP publico | `3.137.119.152` |
| Regiao | `us-east-2` |
| Sistema | Amazon Linux 2023 |
| Disco raiz | 30 GB, 57% utilizado |
| RAM | 1.9 GB |
| Swap | 2 GB, cerca de 1.3 GB em uso |
| Repositorio | `/home/ec2-user/EdEspetoHub`, branch `main` |

O commit e as imagens em execucao mudam a cada release. Consulte:

```bash
cd ~/EdEspetoHub
git log -1 --oneline
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

## Servicos

| Container | Porta no host | Persistencia |
|---|---:|---|
| `janocaminho-frontend` | 8080 | imagem GHCR |
| `janocaminho-backend` | 4000 | imagem GHCR |
| `janocaminho-apis` | 5000 | imagem GHCR |
| `janocaminho-postgres` | 5432 | `edespetohub_postgres-data` |
| `janocaminho-redis` | 6379 | `edespetohub_redis-data` |
| `janocaminho-pgadmin` | 5050 | configuracao Docker |
| `janocaminho-face-worker` | interno 8000 | imagem GHCR |

Os containers nao tinham Docker healthcheck na auditoria.

## Nginx e TLS

Roteamento externo observado:

```text
HTTPS :443
  /           -> frontend :8080
  /api/       -> backend :4000
  /uploads/   -> backend :4000
  /api/maps/  -> configurado para :5051
```

O BFF observado escuta em `:5000`. A configuracao `/api/maps/ -> :5051` e a
entrada direta de `/api/` no backend divergem da arquitetura documentada.
Corrija em mudanca controlada, nao durante um incidente.

O certificado de `janocaminho.com.br` estava valido ate `2026-08-17`. O timer
padrao do Certbot estava desativado, mas o cron de `root` executava diariamente:

```cron
7 4 * * * /usr/local/sbin/jnc-renew-janocaminho-cert.sh >> /var/log/certbot-renew.log 2>&1
```

## Banco e arquivos

Na auditoria:

- PostgreSQL: 190 MB.
- Usuarios: 56.
- Lojas: 19.
- Produtos: 144.
- Pedidos: 2.077.
- Conexoes PostgreSQL: 7 de 100.
- Redis: 1.16 MB usados de limite de 50 MB.
- Uploads locais: 457 arquivos, 123.7 MB.
- `destinations`: 193 arquivos locais e 93 objetos no S3 publico.
- Fotos privadas de clientes e motoboys dependiam do volume local.

## Configuracao e segredos

- Parametro principal: SSM `SecureString` `/chamanoespeto/prod`.
- Versao observada: 16, alterada em 2026-05-18.
- O backend carregava uploads publicos em modo `hybrid`.
- O bucket de backup tinha versionamento, criptografia AES256, bloqueio publico
  e lifecycle para Glacier/expiracao.
- Os buckets de assets tinham criptografia e bloqueio publico; versionamento nao
  foi confirmado.

## Backups observados

### PostgreSQL

- Backup local mais recente estava integro.
- O cron offsite tinha `MIN_INTERVAL_HOURS=48`; devido ao horario fixo, produzia
  na pratica um backup aproximadamente a cada 72 horas.
- O runbook reduz o RPO alvo para seis horas.

### Configuracao

- Backups de 2026-05-22 e 2026-06-06 tinham apenas metadados.
- Causa: o script copiado para `~/bin` inferia `/home/ec2-user` como raiz.
- Ultimo backup valido observado: 2026-05-06.
- O script versionado agora exige `APP_ROOT`, arquivos criticos e export SSM.

### Uploads

- Nao havia backup completo e periodico do volume.
- O espelhamento publico no S3 nao cobria todos os arquivos.
- O runbook adiciona backup diario do volume completo.

## Riscos abertos

1. EC2 e volume raiz sao pontos unicos de falha.
2. Nao foi possivel confirmar snapshots EBS automatizados.
3. Nao existe endpoint publico `/api/health`.
4. Containers nao possuem healthcheck.
5. RAM pequena e swap alta.
6. Processos internos escutam em todas as interfaces do host.
7. A role nao permitia consultar Security Group ou snapshots.
8. Confirme no console AWS que apenas 80/443 e SSH restrito estao publicos.

## Scripts de recuperacao versionados

| Script | Funcao |
|---|---|
| `scripts/pg-backup-rotate.sh` | Backup PostgreSQL, checksum e S3 |
| `scripts/backup-config.sh` | Envs, SSM, compose, Nginx e cron |
| `scripts/backup-uploads-volume.sh` | Backup do volume de uploads |
| `scripts/verify-recovery-backups.sh` | Verifica idade, arquivo e checksum |
| `scripts/restore-postgres-backup.sh` | Restore protegido do PostgreSQL |
| `scripts/restore-uploads-volume.sh` | Restore protegido dos uploads |

## Diagnostico rapido

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
docker stats --no-stream
df -h /
free -h
sudo nginx -t
sudo certbot certificates
docker exec janocaminho-postgres pg_isready -U postgres
docker exec janocaminho-redis redis-cli ping
curl -fsS http://127.0.0.1:5000/health
bash scripts/verify-recovery-backups.sh
```
