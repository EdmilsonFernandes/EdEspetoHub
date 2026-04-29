# Servidor de Produção — Já no Caminho

> Documento de referência para configuração, manutenção e recuperação do servidor.  
> **Guarde este arquivo em local seguro fora do repositório também.**

---

## Acesso ao Servidor

**Provedor:** AWS EC2  
**IP:** `ec2-3-137-119-152.us-east-2.compute.amazonaws.com`  
**Região:** `us-east-2` (Ohio)  
**Usuário:** `ec2-user`  
**Chave SSH:** `medtrack-system.pem` (salva em `/d/PESSOAL/chamanoespeto-aws/`)

```bash
# Conectar ao servidor
ssh -i "/d/PESSOAL/chamanoespeto-aws/medtrack-system.pem" ec2-user@ec2-3-137-119-152.us-east-2.compute.amazonaws.com

# No WSL (Linux):
cp "/mnt/d/PESSOAL/chamanoespeto-aws/medtrack-system.pem" /tmp/jnc.pem
chmod 600 /tmp/jnc.pem
ssh -i /tmp/jnc.pem ec2-user@ec2-3-137-119-152.us-east-2.compute.amazonaws.com
```

---

## Domínio e SSL

**Domínio principal:** `janocaminho.com.br` (e `www.janocaminho.com.br`)  
**SSL:** Let's Encrypt via Certbot  
**Validade atual:** 2026-05-19 (renovar antes de expirar)

```bash
# Renovar SSL manualmente
sudo certbot renew

# Ver status dos certificados
sudo certbot certificates
```

> ⚠️ O certificado `chamanoespeto.com.br` está **EXPIRADO** — não está em uso ativo.

---

## Repositório

**GitHub:** `git@github.com:EdmilsonFernandes/EdEspetoHub.git`  
**Branch de produção:** `main`

```bash
# No servidor, o código fica em:
cd ~/EdEspetoHub

# Ver commit atual em produção
git log -1
```

---

## Deploy

```bash
# Deploy da API (backend)
cd ~/EdEspetoHub
scripts/./deploy-api.sh

# Deploy do Frontend
cd ~/EdEspetoHub
scripts/./deploy-frontend.sh

# Deploy de ambos (sempre API primeiro)
scripts/./deploy-api.sh && scripts/./deploy-frontend.sh
```

### Deploy por imagem pronta (GHCR, sem build pesado no EC2)

Fluxo novo, conservador, em paralelo ao deploy atual:

1. `git push` no `main`
2. GitHub Actions publica imagens no GHCR
3. No EC2, o servidor apenas faz `pull` e recria os containers

Os scripts antigos continuam válidos como fallback.

```bash
# API + face-worker da main mais recente
cd ~/EdEspetoHub
scripts/./deploy-release-api.sh

# Frontend da mesma release
scripts/./deploy-release-frontend.sh

# ou travando em uma release específica
cd ~/EdEspetoHub
scripts/./deploy-release-api.sh 3a254581

# Frontend da mesma release
scripts/./deploy-release-frontend.sh 3a254581
```

Ou em um único passo:

```bash
scripts/./deploy-release.sh

# ou travando tag e serviços
scripts/./deploy-release.sh 3a254581 api frontend face-worker
```

Observações:
- `3a254581` é a tag curta do commit publicada pelo workflow do GHCR.
- sem argumento, os scripts usam `main`.
- para produção mais sensível, o mais seguro continua sendo usar a SHA curta.
- Recomendado: configure `GHCR_USERNAME_SSM_PARAMETER` e `GHCR_TOKEN_SSM_PARAMETER` em `.env.prod` e deixe o token no AWS SSM Parameter Store (`SecureString`).
- Fallback: se preferir local, use `.env.prod.secrets`.
- Se o fluxo novo falhar, o deploy antigo com `deploy-api.sh` e `deploy-frontend.sh` continua funcionando.

### Teste manual rápido no EC2

1. Atualizar o repositório do servidor:

```bash
cd ~/EdEspetoHub
git pull
```

2. Configurar os parâmetros do GHCR no SSM:

```bash
aws ssm put-parameter \
  --name "/janocaminho/prod/ghcr/username" \
  --value "EdmilsonFernandes" \
  --type SecureString \
  --overwrite \
  --region us-east-2

aws ssm put-parameter \
  --name "/janocaminho/prod/ghcr/token" \
  --value "<pat-classic-com-read-packages>" \
  --type SecureString \
  --overwrite \
  --region us-east-2
```

Permissões mínimas para a role/usuário AWS usado no EC2:
- `ssm:GetParameter`
- `kms:Decrypt`

3. Configurar o `.env.prod` para o deploy ler esses parâmetros:

```bash
cd ~/EdEspetoHub
cat >> .env.prod <<'EOF'
AWS_REGION=us-east-2
GHCR_USERNAME_SSM_PARAMETER=/janocaminho/prod/ghcr/username
GHCR_TOKEN_SSM_PARAMETER=/janocaminho/prod/ghcr/token
EOF
```

4. Testar acesso ao SSM e ao GHCR:

```bash
aws ssm get-parameter --name /janocaminho/prod/ghcr/username --with-decryption --region us-east-2
aws ssm get-parameter --name /janocaminho/prod/ghcr/token --with-decryption --region us-east-2
docker pull ghcr.io/edmilsonfernandes/edespetohub-api:main
docker pull ghcr.io/edmilsonfernandes/edespetohub-frontend:main
docker pull ghcr.io/edmilsonfernandes/edespetohub-face-worker:main
```

5. Rodar o deploy novo:

```bash
cd ~/EdEspetoHub
scripts/./deploy-release-api.sh
scripts/./deploy-release-frontend.sh
```

6. Validar:

```bash
docker ps
docker logs chamanoespeto-api --tail 50
docker logs chamanoespeto-frontend --tail 50
```

Fallback:

```bash
cd ~/EdEspetoHub
scripts/./deploy-api.sh
scripts/./deploy-frontend.sh
```

Se precisar testar rápido sem SSM, `.env.prod.secrets` continua aceito como fallback local.

---

## Containers Docker

| Container | Imagem | Porta | Função |
|---|---|---|---|
| `chamanoespeto-frontend` | `edespetohub-frontend:main` | 8080→80 | React + nginx |
| `chamanoespeto-api` | `edespetohub-api:main` | 4000 | Backend Node.js |
| `chamanoespeto-postgres` | `postgres:16` | 5432 | Banco de dados |
| `chamanoespeto-pgadmin` | `pgadmin4:8.13` | 5050 | Admin do banco |
| `chamanoespeto-face-worker` | `edespetohub-face-worker:main` | — | Verificação facial |

```bash
# Ver containers rodando
docker ps

# Ver logs da API (últimas 50 linhas)
docker logs chamanoespeto-api --tail 50

# Ver logs do frontend
docker logs chamanoespeto-frontend --tail 50

# Reiniciar um container
docker restart chamanoespeto-api

# Reiniciar tudo
cd ~/EdEspetoHub && docker compose up -d
```

> O container `chamanoespeto-maps` foi aposentado. Se ainda existir no servidor por legado, pode ser parado e removido.

### GHCR

Workflow responsável:
- `.github/workflows/publish-ghcr.yml`

Imagens publicadas:
- `ghcr.io/edmilsonfernandes/edespetohub-api:<tag>`
- `ghcr.io/edmilsonfernandes/edespetohub-frontend:<tag>`
- `ghcr.io/edmilsonfernandes/edespetohub-face-worker:<tag>`

Tags publicadas:
- `main`
- SHA curta do commit, por exemplo `3a254581`

---

## Banco de Dados

**Host:** `postgres` (interno Docker)  
**Porta:** `5432`  
**Usuário:** `postgres`  
**Banco:** `espetinho`  
**Volume:** `edespetohub_postgres-data` (persistido mesmo após restart)

```bash
# Acessar o banco via psql
docker exec -it chamanoespeto-postgres psql -U postgres -d espetinho

# Executar SQL direto
docker exec chamanoespeto-postgres psql -U postgres -d espetinho -c "SELECT COUNT(*) FROM orders;"

# Backup do banco
docker exec chamanoespeto-postgres pg_dump -U postgres espetinho > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker exec -i chamanoespeto-postgres psql -U postgres espetinho < backup_YYYYMMDD.sql
```

**PgAdmin:** `http://SEU_IP:5050`  
- Email: `admin@janocaminho.com.br`  
- Senha: (ver `.env.docker` ou docker-compose.yml)

---

## Variáveis de Ambiente da API

Arquivo: `~/EdEspetoHub/backend/.env.docker`

```env
# Banco
PGHOST=postgres
PGPORT=5432
PGUSER=postgres
PGDATABASE=espetinho
PGPASSWORD=<senha do banco>

# App
PORT=4000
APP_BASE_URL=https://www.janocaminho.com.br
NODE_ENV=production

# JWT / Segurança
JWT_SECRET=<secret>
MP_OAUTH_ENCRYPTION_KEY=<key>

# Mercado Pago
MP_CLIENT_ID=<client_id>
MP_CLIENT_SECRET=<client_secret>
MP_WEBHOOK_URL=https://www.janocaminho.com.br/api/webhooks/mercadopago
MP_WEBHOOK_SECRET=<webhook_secret>
MP_API_BASE_URL=https://api.mercadopago.com
MP_DEBUG=true

# Email (Zoho)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=contato@chamanoespeto.com.br
SMTP_PASS=<senha>
SMTP_SECURE=false
EMAIL_FROM=Jano Caminho <contato@janocaminho.com.br>

# Firebase (Push Notifications)
FCM_PROJECT_ID=ja-no-caminho-mobile
FCM_SERVICE_ACCOUNT_PATH=/app/keys/firebase-adminsdk.json

# AWS SSM (secrets em produção)
SSM_PARAMETER_NAME=/chamanoespeto/prod
AWS_REGION=us-east-2
SSM_OVERRIDE=false

# Admin
SUPER_ADMIN_EMAIL=admin@chamanoespeto.com.br
```

> 💡 Os secrets sensíveis (JWT, MP keys, etc.) ficam no **AWS SSM Parameter Store** em `/chamanoespeto/prod` e são carregados automaticamente no boot da API.

### Jobs agendados

Os jobs do backend rodam dentro do próprio processo da API e sobem no boot da aplicação.
Guia técnico: [`docs/BACKEND_JOBS.md`](./BACKEND_JOBS.md)

Variáveis úteis de operação:

```env
DELIVERY_EXPIRATION_JOB_ENABLED=true
DELIVERY_EXPIRATION_INTERVAL_MS=120000

FACE_VERIFY_JOB_ENABLED=true
FACE_VERIFY_JOB_INTERVAL_MS=30000

AWAITING_PAYMENT_EXPIRATION_JOB_ENABLED=true
AWAITING_PAYMENT_EXPIRATION_INTERVAL_MS=120000
AWAITING_PAYMENT_EXPIRATION_THRESHOLD_MINUTES=40

STORE_DASHBOARD_SNAPSHOT_JOB_ENABLED=true
STORE_DASHBOARD_SNAPSHOT_INTERVAL_MS=600000
STORE_DASHBOARD_SNAPSHOT_MAX_DATES=500
```

> Se a API subir em mais de uma instância, cada instância executará esses jobs também. Hoje não há lock distribuído global.

---

## AWS SSM Parameter Store

Os secrets de produção ficam no SSM para não ficarem no `.env.docker`.

```bash
# Ver parâmetros (requer AWS CLI configurado)
aws ssm get-parameters-by-path --path "/chamanoespeto/prod" --with-decryption --region us-east-2

# Atualizar um parâmetro
aws ssm put-parameter \
  --name "/chamanoespeto/prod/JWT_SECRET" \
  --value "novo_valor" \
  --type SecureString \
  --overwrite \
  --region us-east-2
```

---

## Mercado Pago — Configuração OAuth

**Painel:** https://www.mercadopago.com.br/developers/panel/app  
**App:** `chamanoespeto`

### URLs cadastradas no painel do MP:

| Tipo | URL |
|---|---|
| OAuth Redirect URI | `https://janocaminho.com.br/api/payment-accounts/mercadopago/callback` |
| Webhook (Produção) | `https://www.janocaminho.com.br/api/webhooks/mercadopago` |

### Eventos do Webhook habilitados:
- ✅ Pagamentos

### Fluxo OAuth (como funciona):
1. Lojista clica "Conectar Mercado Pago" no painel admin
2. Backend gera URL: `https://auth.mercadopago.com.br/authorization?redirect_uri=https://janocaminho.com.br/api/...`
3. Lojista autoriza no site do MP
4. MP redireciona para `https://janocaminho.com.br/api/payment-accounts/mercadopago/callback?code=...`
5. Backend troca o `code` pelo `access_token` e salva no banco
6. Redireciona para `/admin/dashboard?tab=gateway&paymentAccount=connected`

---

## Firebase (Push Notifications)

**Projeto:** `ja-no-caminho-mobile`  
**Arquivo de credenciais:** `~/EdEspetoHub/backend/keys/firebase-adminsdk.json`

> ⚠️ Este arquivo **não está no git** (`.gitignore`). Se perder o servidor, baixar novamente do Firebase Console em:  
> https://console.firebase.google.com → Projeto → Configurações → Contas de serviço → Gerar nova chave privada

---

## Nginx (Servidor)

Arquivo: `/etc/nginx/conf.d/janocaminho.conf`

```nginx
server {
  server_name janocaminho.com.br www.janocaminho.com.br;

  location / {
    proxy_pass http://127.0.0.1:8080;  # Frontend container
  }

  location /api/ {
    proxy_pass http://127.0.0.1:4000/api/;  # API container
  }

  listen 443 ssl; # Certbot
}

server {
  listen 80;
  server_name janocaminho.com.br www.janocaminho.com.br;
  return 301 https://www.janocaminho.com.br$request_uri;
}
```

```bash
# Testar configuração nginx
sudo nginx -t

# Recarregar nginx
sudo nginx -s reload
```

---

## Recuperação do Zero (Servidor Novo)

Se perder o servidor e precisar recriar do zero:

### 1. Criar EC2
- AMI: Amazon Linux 2023
- Tipo: `t3.medium` ou superior
- Security Group: portas 22, 80, 443, 5432 (só interno)

### 2. Instalar dependências
```bash
sudo yum update -y
sudo yum install -y docker git nginx certbot python3-certbot-nginx
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker ec2-user
# Instalar docker compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
```

### 3. Clonar repositório
```bash
cd ~
git clone git@github.com:EdmilsonFernandes/EdEspetoHub.git
cd EdEspetoHub
```

### 4. Restaurar arquivos sensíveis
```bash
# Criar o .env.docker com os valores do SSM/backup
nano backend/.env.docker

# Restaurar firebase-adminsdk.json
mkdir -p backend/keys
# Copiar o arquivo do Firebase Console
```

### 5. Restaurar banco de dados
```bash
# Subir só o postgres primeiro
docker compose up -d postgres

# Restaurar backup
docker exec -i chamanoespeto-postgres psql -U postgres espetinho < backup.sql
```

### 6. Subir tudo
```bash
docker compose up -d
```

### 7. Configurar nginx e SSL
```bash
# Copiar config do nginx
sudo cp docs/nginx/chamanoespeto.conf /etc/nginx/conf.d/
sudo nginx -t && sudo nginx -s reload

# Gerar SSL
sudo certbot --nginx -d janocaminho.com.br -d www.janocaminho.com.br
```

---

## Monitoramento Rápido

```bash
# Ver todos os containers e status
docker ps

# Ver uso de recursos
docker stats --no-stream

# Ver logs de erro da API
docker logs chamanoespeto-api --tail 100 2>&1 | grep '"level":"warn"\|"level":"error"'

# Testar se a API está respondendo
curl -s https://janocaminho.com.br/api/health | head -c 100

# Ver espaço em disco
df -h

# Ver uso de memória
free -h
```

---

## Contatos e Acessos

| Serviço | URL / Acesso |
|---|---|
| GitHub | https://github.com/EdmilsonFernandes/EdEspetoHub |
| AWS Console | https://console.aws.amazon.com |
| Mercado Pago Dev | https://www.mercadopago.com.br/developers/panel/app |
| Firebase Console | https://console.firebase.google.com |
| Zoho Mail | https://mail.zoho.com |
| PgAdmin (prod) | http://ec2-3-137-119-152.us-east-2.compute.amazonaws.com:5050 |
