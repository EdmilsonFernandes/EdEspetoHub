# Runbook de contingência e recuperação

Data da auditoria: `2026-06-13`

Este documento é a fonte principal para recuperar o Já no Caminho após falha parcial, perda total do EC2 ou migração para outro servidor. Ele não contém segredos. Valores sensíveis continuam no AWS SSM Parameter Store e nos backups privados.

## 1. Objetivos operacionais

| Componente | RPO alvo | RTO alvo | Fonte de recuperação |
|---|---:|---:|---|
| Código e imagens Docker | último commit publicado | 30-60 min | GitHub + GHCR |
| PostgreSQL | até 6 horas | 60-120 min | backup `sql.gz` no S3 |
| Configurações e chaves | até 24 horas e após mudança crítica | 30-60 min | SSM + backup de configuração no S3 |
| Uploads locais | até 24 horas | 60-120 min | backup do volume no S3 |
| Redis | perda aceitável | 5-15 min | recriação vazia |
| Certificado TLS | regenerável | 15-30 min | Let's Encrypt/Certbot |

RPO é o máximo de dados que se aceita perder. RTO é o tempo esperado para voltar a operar. Esses objetivos só passam a valer depois que os crons recomendados neste documento forem instalados e o primeiro ciclo for validado.

## 2. Estado auditado e riscos atuais

Na auditoria de `2026-06-13`:

- EC2 `i-0655add58c3bce86a`, Amazon Linux 2023, 30 GB de disco e cerca de 2 GB de RAM.
- Todos os serviços rodam na mesma instância. O EC2 e o volume raiz são pontos únicos de falha.
- PostgreSQL usa o volume Docker `edespetohub_postgres-data`.
- Uploads usam o volume Docker `edespetohub_uploads_data`.
- Redis usa `edespetohub_redis-data` e pode ser recriado vazio.
- Banco tinha 190 MB, 56 usuários, 19 lojas, 144 produtos e 2.077 pedidos.
- Backup local do banco estava íntegro, mas o backup offsite no S3 ocorria aproximadamente a cada 72 horas.
- Os backups de configuração de `2026-05-22` e `2026-06-06` estavam inválidos: continham apenas metadados.
- O backup válido mais recente de configuração era de `2026-05-06`.
- O SSM `/chamanoespeto/prod` estava ativo, `SecureString`, versão 16.
- O backend operava uploads públicos em modo `hybrid`.
- O volume local tinha 457 arquivos e 123,7 MB.
- A pasta local `destinations` tinha 193 arquivos, mas o S3 público tinha apenas 93. Cerca de 100 imagens dependiam apenas do volume.
- Fotos privadas de clientes, motoboys, perfil e gorjetas também dependiam do volume local.
- Certificado `janocaminho.com.br` válido até `2026-08-17`.
- Renovação TLS existe em cron raiz diário, apesar do timer padrão `certbot-renew.timer` estar desativado.
- Não existe endpoint público `/api/health`.
- Containers não possuem Docker healthcheck.
- O Nginx externo atual encaminha `/api/` diretamente ao backend em `:4000`; isso diverge da arquitetura documentada do BFF.
- A role do EC2 acessa SSM e S3, mas não permite `ec2:DescribeInstances`, snapshots ou security groups.

## 3. Fontes de verdade

Use nesta ordem:

1. GitHub `main`: código, compose, scripts e documentação.
2. GHCR: imagens imutáveis por SHA curta.
3. AWS SSM `/chamanoespeto/prod`: segredos e configurações centrais.
4. S3 `jnc-db-backups-prod-222984221398`: banco, configuração e uploads.
5. S3 `jnc-public-assets-prod-222984221398`: uploads públicos já espelhados.
6. Backup local do EC2: recuperação rápida quando o disco ainda está acessível.
7. Console dos provedores: Firebase, Mercado Pago, Zoho e Registro.br.

Nunca dependa apenas de um `.env` local ou do volume Docker da instância.

## 4. Automação obrigatória

### 4.1 Banco a cada 6 horas, local e S3

Use um intervalo menor que o cron para evitar que diferenças de segundos façam o script pular um ciclo:

```cron
17 */6 * * * PATH=/usr/local/bin:/usr/bin:/bin BACKUP_DIR=/var/backups/janocaminho MIN_INTERVAL_HOURS=5 KEEP_LATEST=1 BACKUP_S3_BUCKET=jnc-db-backups-prod-222984221398 BACKUP_S3_PREFIX=postgres/espetinho/cron BACKUP_S3_SSE=AES256 BACKUP_S3_STORAGE_CLASS=STANDARD bash /home/ec2-user/EdEspetoHub/scripts/pg-backup-rotate.sh >> /var/log/pg-backup.log 2>&1
```

### 4.2 Configuração diária

Execute o script a partir do repositório ou informe `APP_ROOT`. Isso evita o erro histórico causado pela cópia em `~/bin`.

```cron
25 2 * * * PATH=/usr/local/bin:/usr/bin:/bin APP_ROOT=/home/ec2-user/EdEspetoHub BACKUP_DIR=/var/backups/janocaminho/config KEEP_DAYS=30 MIN_INTERVAL_HOURS=20 CONFIG_BACKUP_S3_BUCKET=jnc-db-backups-prod-222984221398 CONFIG_BACKUP_S3_PREFIX=config/runtime CONFIG_BACKUP_SSM_EXPORT_MODE=required sh /home/ec2-user/EdEspetoHub/scripts/backup-config.sh >> /var/log/config-backup.log 2>&1
```

O script deve falhar se não capturar:

- `backend/.env.docker`
- `apis/.env.docker`
- `.env.prod`
- os três arquivos Docker Compose usados em produção
- JSON exportado do SSM

### 4.3 Uploads locais diariamente

```cron
40 2 * * * PATH=/usr/local/bin:/usr/bin:/bin UPLOADS_BACKUP_DIR=/var/backups/janocaminho/uploads MIN_INTERVAL_HOURS=20 KEEP_LATEST=1 UPLOADS_BACKUP_S3_BUCKET=jnc-db-backups-prod-222984221398 UPLOADS_BACKUP_S3_PREFIX=uploads/volume UPLOADS_BACKUP_S3_SSE=AES256 bash /home/ec2-user/EdEspetoHub/scripts/backup-uploads-volume.sh >> /var/log/uploads-backup.log 2>&1
```

### 4.4 Verificação diária

```cron
20 5 * * * DB_BACKUP_DIR=/var/backups/janocaminho CONFIG_BACKUP_DIR=/var/backups/janocaminho/config UPLOADS_BACKUP_DIR=/var/backups/janocaminho/uploads DB_MAX_AGE_HOURS=8 CONFIG_MAX_AGE_HOURS=30 UPLOADS_MAX_AGE_HOURS=30 bash /home/ec2-user/EdEspetoHub/scripts/verify-recovery-backups.sh >> /var/log/recovery-verification.log 2>&1
```

O próximo passo recomendado é enviar falha desse verificador para CloudWatch, SNS, Discord ou outro canal fora do próprio EC2. Um log local não avisa quando a instância inteira morreu.

## 5. Checklist diário de saúde

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
curl -fsS https://www.janocaminho.com.br/ >/dev/null
```

Como ainda não há `/api/health` público, valide o BFF internamente por `http://127.0.0.1:5000/health` e a aplicação externamente pela Home.

## 6. Diagnóstico por incidente

### 6.1 Site inteiro não responde

1. Teste DNS:

```bash
nslookup janocaminho.com.br
```

2. Teste HTTPS:

```bash
curl -Iv --max-time 15 https://www.janocaminho.com.br/
```

3. No console AWS, veja `Instance state` e `Status checks`.
4. Se o EC2 estiver ligado, teste SSH.
5. Se SSH responder:

```bash
sudo systemctl status nginx --no-pager
sudo nginx -t
docker ps -a
df -h /
free -h
```

6. Reinicie apenas o componente com falha. Não use `docker compose down -v`.
7. Se a instância ou disco não for recuperável, siga a recuperação total.

### 6.2 Backend ou BFF parou

```bash
docker logs janocaminho-backend --tail 150
docker logs janocaminho-apis --tail 150
docker restart janocaminho-backend
docker restart janocaminho-apis
curl -fsS http://127.0.0.1:5000/health
```

Se houver erro de banco, não recrie volume. Verifique PostgreSQL primeiro.

### 6.3 PostgreSQL parou ou corrompeu

```bash
docker logs janocaminho-postgres --tail 200
docker exec janocaminho-postgres pg_isready -U postgres
docker volume inspect edespetohub_postgres-data
df -h /
```

Se o volume estiver saudável, reinicie somente o PostgreSQL. Se precisar restaurar:

```bash
docker stop janocaminho-backend janocaminho-apis
ALLOW_PRODUCTION_RESTORE=true \
BACKEND_STOPPED_ACK=true \
bash scripts/restore-postgres-backup.sh /caminho/espetinho_YYYYMMDDTHHMMSSZ.sql.gz espetinho
docker start janocaminho-backend janocaminho-apis
```

Valide contagens, login, loja, produto e pedido antes de liberar tráfego.

### 6.4 E-mail deixou de enviar

1. Consulte `Super Admin > E-mails e templates > Saúde`.
2. Consulte o banco:

```sql
SELECT template_key, to_email, status, error_message, created_at
FROM email_send_logs
ORDER BY created_at DESC
LIMIT 50;
```

3. Veja logs:

```bash
docker logs janocaminho-backend --since 2h 2>&1 | grep -Ei 'smtp|email|zoho|550|blocked'
```

4. Confirme apenas presença das variáveis, sem imprimir valores:

```bash
docker exec janocaminho-backend sh -lc 'for k in SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS EMAIL_FROM; do test -n "$(printenv "$k")" && echo "$k=ok" || echo "$k=missing"; done'
```

5. Se Zoho retornar `550 5.4.6`, use o painel de desbloqueio da conta remetente.
6. Envie e-mail de teste pelo Super Admin.
7. Não apague a conta do usuário. Após o SMTP voltar, o usuário deve reenviar o código.

O plano futuro deve manter um segundo SMTP configurável, mas credenciais do Gmail ou outro provedor não devem ser colocadas no Git.

### 6.5 Certificado expirando ou HTTPS quebrado

```bash
sudo certbot certificates
sudo certbot renew --cert-name janocaminho.com.br --dry-run
sudo nginx -t
sudo systemctl reload nginx
sudo tail -n 100 /var/log/certbot-renew.log
```

O cron raiz esperado:

```cron
7 4 * * * /usr/local/sbin/jnc-renew-janocaminho-cert.sh >> /var/log/certbot-renew.log 2>&1
```

Não dependa do `certbot-renew.timer`, pois ele estava desativado na auditoria.

### 6.6 Disco cheio

```bash
df -h /
docker system df
sudo du -xhd1 /var /home/ec2-user 2>/dev/null | sort -h
```

Remova somente caches e imagens Docker não usadas após confirmar as imagens ativas. Nunca apague volumes do PostgreSQL ou uploads.

### 6.7 SSM indisponível

O backend precisa ao menos de `AWS_REGION`, `SSM_PARAMETER_NAME` e credenciais de banco/bootstrap no arquivo local para iniciar. Se SSM estiver temporariamente indisponível:

1. Use o último backup válido de configuração.
2. Restaure os envs com permissão `600`.
3. Mantenha `SSM_OVERRIDE=false` apenas durante a contingência.
4. Quando SSM voltar, restaure a precedência esperada e recrie o backend.

### 6.8 S3 indisponível

- Banco: use o backup local mais recente se o EC2 ainda existir.
- Upload público: modo `hybrid` cai para o volume local.
- Não mude para modo `s3` enquanto existirem objetos ausentes.
- Depois da recuperação, execute novamente o espelhamento de uploads públicos.

## 7. Recuperação total em novo EC2

### 7.1 Preparar infraestrutura

1. Crie Amazon Linux 2023 em `us-east-2`.
2. Use no mínimo a mesma capacidade atual; prefira 4 GB de RAM para reduzir swap.
3. Anexe uma role com:
   - `ssm:GetParameter`
   - `kms:Decrypt`, se o parâmetro usar KMS próprio
   - leitura/escrita nos três buckets do projeto
4. No Security Group, exponha publicamente apenas:
   - `80/tcp`
   - `443/tcp`
   - `22/tcp` restrito ao IP administrativo quando possível
5. Não exponha `4000`, `5000`, `5050`, `5432`, `6379` ou `8080`.
6. Prefira Elastic IP. Se não existir, será necessário alterar os registros A no Registro.br.

### 7.2 Instalar base

```bash
sudo dnf update -y
sudo dnf install -y docker git nginx certbot python3-certbot-nginx awscli2
sudo systemctl enable --now docker nginx
sudo usermod -aG docker ec2-user
```

Instale o plugin Docker Compose e abra nova sessão após adicionar o usuário ao grupo Docker.

### 7.3 Clonar e preparar bootstrap

```bash
git clone git@github.com:EdmilsonFernandes/EdEspetoHub.git
cd EdEspetoHub
git checkout main
```

Baixe o último backup válido de configuração:

```bash
aws s3 cp s3://jnc-db-backups-prod-222984221398/config/runtime/config-backup-YYYYMMDDTHHMMSSZ.tar.gz /tmp/config.tar.gz
mkdir -p /tmp/jnc-config
tar -xzf /tmp/config.tar.gz -C /tmp/jnc-config
```

Valide `checksums.sha256` antes de copiar. Restaure envs e Firebase com permissão restrita:

```bash
chmod 600 backend/.env.docker apis/.env.docker .env.prod backend/keys/firebase-adminsdk.json
```

Se o backup não estiver disponível, crie envs mínimos apontando para `/chamanoespeto/prod` e regenere a chave do Firebase Console.

### 7.4 Criar volumes e subir PostgreSQL

```bash
docker volume create edespetohub_postgres-data
docker volume create edespetohub_uploads_data
docker volume create edespetohub_redis-data

docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.deploy.yml \
  --env-file .env.prod \
  up -d --no-build postgres redis
```

### 7.5 Restaurar banco

```bash
aws s3 cp s3://jnc-db-backups-prod-222984221398/postgres/espetinho/cron/espetinho_YYYYMMDDTHHMMSSZ.sql.gz /tmp/espetinho.sql.gz

ALLOW_PRODUCTION_RESTORE=true \
BACKEND_STOPPED_ACK=true \
bash scripts/restore-postgres-backup.sh /tmp/espetinho.sql.gz espetinho
```

### 7.6 Restaurar uploads

```bash
aws s3 cp s3://jnc-db-backups-prod-222984221398/uploads/volume/uploads_YYYYMMDDTHHMMSSZ.tar.gz /tmp/uploads.tar.gz

ALLOW_UPLOADS_RESTORE=true \
bash scripts/restore-uploads-volume.sh /tmp/uploads.tar.gz
```

### 7.7 Subir aplicações por SHA

Use uma tag conhecida e publicada:

```bash
scripts/./deploy-release.sh <sha-curta> backend apis frontend face-worker
```

Não use `main` durante recuperação se uma SHA estável conhecida estiver disponível.

### 7.8 Nginx, DNS e TLS

1. Restaure o Nginx do backup de configuração ou use `docs/nginx/chamanoespeto.conf` como base.
2. Valide:

```bash
sudo nginx -t
```

3. Reassocie o Elastic IP ou atualize os registros A de `janocaminho.com.br` e `www`.
4. Aguarde propagação.
5. Emita certificado:

```bash
sudo certbot --nginx -d janocaminho.com.br -d www.janocaminho.com.br
```

6. Instale o cron de renovação e valide com `--dry-run`.

### 7.9 Validação antes de liberar

```bash
docker ps
docker exec janocaminho-postgres pg_isready -U postgres
docker exec janocaminho-redis redis-cli ping
curl -fsS http://127.0.0.1:5000/health
curl -fsS https://www.janocaminho.com.br/ >/dev/null
```

Valide manualmente:

1. Home e destinos.
2. Login cliente, lojista e motoboy.
3. Vitrine e produtos com imagens.
4. Pedido de retirada.
5. Pedido de entrega.
6. Pedido postal.
7. Atualização de status.
8. E-mail de teste.
9. Push de teste.
10. Upload de imagem.
11. Mercado Pago/webhook.

## 8. Migração planejada para outro servidor

1. Sete dias antes, confirme backups e execute um restore drill.
2. Um dia antes, reduza TTL DNS para 300 segundos.
3. Prepare o novo servidor sem alterar DNS.
4. Restaure uma cópia do banco e uploads para testes.
5. Valide todos os fluxos críticos.
6. Na janela de corte, coloque pedidos em manutenção ou interrompa escrita.
7. Gere backup final do banco e uploads.
8. Restaure o delta/final no novo servidor.
9. Troque Elastic IP ou DNS.
10. Reative escrita e valide pedidos/pagamentos.
11. Mantenha o servidor antigo desligado para escrita, mas disponível por 24-72 horas para rollback.

Não opere dois backends produtivos simultaneamente: os jobs internos não possuem lock distribuído e podem executar em duplicidade.

## 9. Restore drill periódico

Mensalmente:

1. Copie o backup S3 mais recente para ambiente local ou servidor temporário.
2. Restaure em banco com nome `jnc_restore_drill`.
3. Confirme contagens e cinco consultas críticas.
4. Extraia o backup de uploads em volume temporário.
5. Valide o backup de configuração e checksums.
6. Registre data, duração, tamanho, resultado e responsável.
7. Apague banco/volume temporário somente após registrar sucesso.

Comando local seguro:

```bash
bash scripts/restore-postgres-backup.sh .local-db-dumps/recovery-drill.sql.gz jnc_restore_drill
```

### Evidencia de restore em 2026-06-13

O backup corrente do EC2 `espetinho_20260613T080003Z.sql.gz` foi copiado para
o ambiente local, validado com `gzip -t` e restaurado em
`jnc_restore_drill`. Resultado:

| Entidade | Total |
|---|---:|
| users | 56 |
| stores | 19 |
| products | 144 |
| orders | 2.077 |
| site_settings | 11 |

O banco temporario foi removido depois da validacao. Esse teste prova que o
arquivo auditado pode ser restaurado; nao substitui o restore drill mensal dos
backups futuros.

## 10. Próximas melhorias de infraestrutura

Prioridade alta:

1. Ativar backup diário do volume de uploads.
2. Corrigir e executar imediatamente um backup válido de configuração.
3. Reduzir backup offsite do banco para seis horas.
4. Criar alerta externo para falha de backup e indisponibilidade HTTPS.
5. Confirmar no AWS Console se o IP é Elastic IP.
6. Remover portas internas do Security Group.
7. Criar snapshots automáticos do EBS via Data Lifecycle Manager.

Prioridade média:

1. Criar endpoint público mínimo de readiness sem expor dados.
2. Adicionar Docker healthchecks.
3. Normalizar Nginx para o fluxo BFF documentado.
4. Migrar todos os uploads públicos restantes ao S3.
5. Migrar arquivos privados para S3 privado.
6. Considerar PostgreSQL gerenciado quando receita e carga justificarem.

## 11. Instrução para agentes de IA

Antes de operar recuperação:

1. Ler `.ai/agent-rules.md`.
2. Ler este runbook.
3. Ler `docs/SERVIDOR_PRODUCAO.md`.
4. Confirmar se o incidente é aplicação, banco, DNS, TLS, SSM ou EC2.
5. Começar por comandos de leitura.
6. Nunca executar `docker compose down -v`.
7. Nunca imprimir segredos, tokens ou conteúdo descriptografado do SSM.
8. Nunca restaurar sobre `espetinho` sem confirmação explícita e backend parado.
9. Preferir imagem GHCR por SHA conhecida.
10. Registrar horário, backup escolhido, comandos e resultado.
