# Chama no espeto

Aplicação web para pedidos e gestão do restaurante de espetinhos Datony. O projeto traz duas experiências principais:

- **Loja do cliente**: montagem e edição do pedido, envio para WhatsApp e pagamento via chave Pix.
- **Painel interno**: dashboard com métricas, CRUD de produtos, fila do churrasqueiro (atualização a cada 5s) e histórico de pedidos.

## Estrutura de pastas

- `frontend/`: aplicação React (Create React App) servida pelo nginx em produção.
- `backend/`: API Node.js/Express + TypeORM em TypeScript, com documentação Swagger em `/api/docs`.
- `docker-compose.yml`: sobe frontend, API, PostgreSQL e pgAdmin já apontando para as pastas certas.

## Visão geral do stack

- **Front-end**: React (Create React App) servido por nginx (`frontend/Dockerfile`).
- **API**: Node.js/Express/TypeORM (`backend/`).
- **Banco de dados**: PostgreSQL com schema em `backend/schema.sql` e recursos opcionais de administração via pgAdmin.

Requisitos mínimos para desenvolvimento local:

- Node.js 18+ e npm/yarn
- PostgreSQL 16+ (local) ou Docker
- Docker + Docker Compose (para execução conteinerizada)

## Passo a passo para um novo dev (local, sem Docker Compose)

1) **Clonar e instalar dependências**

```bash
git clone <repo>
cd EdEspetoHub
cd backend && npm install
cd ../frontend && npm install
```

2) **Subir o PostgreSQL local** (ou use seu próprio)

```bash
createdb espetinho
psql -h localhost -U postgres -d espetinho -f backend/schema.sql
```

Se preferir Docker só para o banco:

```bash
docker run --name espetinho-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=espetinho -p 5432:5432 -d postgres:16
docker exec -i espetinho-db psql -U postgres -d espetinho < backend/schema.sql
```

3) **Configurar variáveis de ambiente da API**

As variáveis lidas são `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PORT`, `JWT_SECRET`.
Para super admin: `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`.
Para Mercado Pago: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_URL` (opcional `MP_API_BASE_URL`).
Webhook seguro (opcional): `MP_WEBHOOK_SECRET`.
Debug MP: `MP_DEBUG=true` para logs das chamadas.
Para e-mails: `APP_BASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `EMAIL_FROM`.

Exemplo (no terminal):

```bash
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD=postgres
export PGDATABASE=espetinho
export PORT=4000
export JWT_SECRET=super-secret-token
export SUPER_ADMIN_EMAIL=superadmin@local.com
export SUPER_ADMIN_PASSWORD=super123
export MP_ACCESS_TOKEN=...
export MP_PUBLIC_KEY=...
export MP_WEBHOOK_URL=http://localhost:4000/api/webhooks/mercadopago
export MP_WEBHOOK_SECRET=...
export APP_BASE_URL=http://localhost:3000
export SMTP_HOST=smtp.seu-provedor.com
export SMTP_PORT=587
export SMTP_USER=usuario
export SMTP_PASS=senha
export SMTP_SECURE=false
export EMAIL_FROM="Chama no Espeto <no-reply@chamanoespeto.com>"
```

4) **Subir a API**

```bash
cd backend
npm run dev
```

5) **Configurar o front**

Crie `frontend/.env`:

```bash
VITE_API_BASE_URL=http://localhost:4000/api
```

6) **Subir o front**

```bash
cd frontend
npm run dev
```

7) **Acessar**

- Vitrine: `http://localhost:3000/<slug>`
- Admin: `http://localhost:3000/admin`
- Pedidos: `http://localhost:3000/admin/orders`
- Fila: `http://localhost:3000/admin/queue`

## Criar loja/admin e obter planId (primeiro acesso)

1) **Listar planos (gera seed automaticamente)**

```bash
curl http://localhost:4000/api/plans
```

2) **Registrar loja e admin**

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Admin Local",
    "email": "admin@local.com",
    "password": "admin123",
    "storeName": "Espetinho do Teste",
    "primaryColor": "#b91c1c",
    "secondaryColor": "#111827",
    "paymentMethod": "PIX",
    "planId": "<PLAN_ID>"
  }'
```

3) **Login admin (slug + senha)**

```bash
curl -X POST http://localhost:4000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "espetinho-do-teste",
    "password": "admin123"
  }'
```

Depois disso, acesse o painel em `http://localhost:3000/admin`.

## Super Admin (visao da plataforma)

1) **Configurar credenciais**

Use as envs `SUPER_ADMIN_EMAIL` e `SUPER_ADMIN_PASSWORD` na API.

2) **Login**

```bash
curl -X POST http://localhost:4000/api/auth/super-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@local.com",
    "password": "super123"
  }'
```

3) **Tela**

Acesse: `http://localhost:3000/superadmin`

## Subir em EC2 (Docker Compose pré-configurado)

O `docker-compose.yml` usa `FRONTEND_PORT` para decidir a porta pública do front.
O valor padrão é `8080` via `.env` no repositório, mantendo o uso local.

No servidor EC2, crie/ajuste um arquivo `.env.prod` com a porta 80
(use `.env.prod.example` como base):

```bash
FRONTEND_PORT=80
```

Suba usando o arquivo de ambiente de produção:

```bash
docker compose --env-file .env.prod up --build -d
```

Serviços esperados:
- Front-end: `http://<EC2-IP>` (porta 80)
- API: `http://<EC2-IP>:4000` (Swagger em `/api/docs`)
- pgAdmin (opcional): `http://<EC2-IP>:5050`

Em produção, ajuste senhas/segredos e restrinja portas no Security Group.
Checklist de portas no Security Group:
- 22 (SSH)
- 80 (front)
- 443 (HTTPS, se usar)
- 4000 (API)
- 5050 (pgAdmin, opcional)
- 5432 (Postgres) **não** expor publicamente

## Webhook Mercado Pago com ngrok (teste local)

1) Suba a API localmente na porta 4000.
2) Em outro terminal:

```bash
ngrok http 4000
```

3) Copie a URL pública gerada (ex.: `https://abcd1234.ngrok-free.app`).
4) Configure no painel do Mercado Pago:
   - URL de webhook: `https://abcd1234.ngrok-free.app/api/webhooks/mercadopago`
   - Eventos: **Pagamentos**
   - Se habilitar "Assinatura secreta", copie para `MP_WEBHOOK_SECRET`
5) Exporte a env local:

```bash
export MP_WEBHOOK_URL=https://abcd1234.ngrok-free.app/api/webhooks/mercadopago
export MP_WEBHOOK_SECRET=...
```

Se configurar assinatura secreta no painel, defina `MP_WEBHOOK_SECRET` na API.

### O que é ngrok (explicação rápida)
ngrok cria um túnel público temporário para seu servidor local. Isso permite que o Mercado Pago envie o webhook para sua máquina local durante testes. Sempre que você reiniciar o ngrok, a URL pública muda (a menos que use um plano pago com URL fixa).

## Execução local (sem Docker)

### 1. Banco de dados

1. Crie um banco chamado `espetinho` e aplique o schema inicial (opcional, a API também cria tabelas on-demand):

    ```bash
    psql -h localhost -U postgres -d espetinho -f backend/schema.sql
    ```

2. Variáveis de conexão usadas pelo `pg` (padrões: `postgres` / `postgres`):

    ```bash
    export PGHOST=localhost
    export PGUSER=postgres
    export PGPASSWORD=postgres
    export PGDATABASE=espetinho
    ```

### 2. API (pasta `backend/`)

```bash
cd backend
npm install
npm run dev    # desenvolvimento com reload
npm run build  # gera dist/
npm start      # roda dist/app.js
```

A API sobe em `http://localhost:4000` e expõe a documentação Swagger em `http://localhost:4000/api/docs`. Durante a inicialização ela valida a conexão com o PostgreSQL usando as variáveis de ambiente listadas acima.

Endpoints principais:

- `POST /api/auth/register` — cria usuário, loja e retorna token JWT.
- `POST /api/auth/admin-login` — autenticação via slug + senha.
- `POST /api/auth/login` — autenticação via e-mail + senha.
- `GET /api/stores/:slug`, `PUT /api/stores/:id`, `PUT /api/stores/:id/status` — gerenciamento de loja.
- `GET /api/stores/:storeId/products`, `POST /api/stores/:storeId/products` — catálogo (admin).
- `GET /api/stores/slug/:slug/products` — catálogo público por loja (vitrine).
- `GET /api/stores/:storeId/orders`, `POST /api/stores/:storeId/orders` — pedidos e fila.

### 3. Front-end React (pasta `frontend/`)

```bash
cd frontend
npm install
npm run dev
```

Crie um arquivo `.env` (ou use `.env.production`) na pasta `frontend/` com o endpoint da API:

```bash
VITE_API_BASE_URL=http://localhost:4000/api
```

Com a API em execução, a loja fica acessível em:

- Vitrine (cliente): `http://localhost:3000/<slug>` (ex: `http://localhost:3000/lojadoedmilson`)
- Admin pedidos: `http://localhost:3000/admin/orders`
- Fila do churrasqueiro: `http://localhost:3000/admin/queue`

### 4. pgAdmin (opcional, local)

- Host: `localhost`
- Porta: `5432`
- Usuário: `postgres`
- Senha: a que você definiu

## Execução com Docker

### Subir tudo com Docker Compose

```bash
docker compose up --build
```

Serviços expostos:

- Front-end: http://localhost:8080
- API: http://localhost:4000 (Swagger em `/api/docs`)
- PostgreSQL: porta 5432 (volume `postgres-data`)
- pgAdmin: http://localhost:5050

### Rodar com portas de produção (porta 80)

Crie um arquivo `.env.prod` com `FRONTEND_PORT=80` e suba assim:

```bash
docker compose --env-file .env.prod up --build -d
```

### Atalhos (scripts)

Execução local (porta 8080):

```bash
sh scripts/compose-dev.sh
```

Execução produção (porta 80):

```bash
sh scripts/compose-prod.sh
```

Credenciais padrão do pgAdmin (pode sobrescrever via variáveis de ambiente ao subir): `admindatony@datony.com` / `Datony20025#!`.

### Atualizar schema (horário de funcionamento)

Para bancos existentes, a API aplica a migração automaticamente ao iniciar
(`opening_hours` e `social_links` em `store_settings`). Basta reiniciar a API.

Se quiser aplicar manualmente, use:

```sql
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '[]';
```

Com Docker:

```bash
docker exec -i chamanoespeto-postgres psql -U postgres -d espetinho <<'SQL'
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '[]';
SQL
```

Para um banco vazio, continue usando o `backend/schema.sql` (já contém a coluna nova).

### Imagens individuais

- **Front-end** (usa `frontend/Dockerfile` com nginx):

    ```bash
    cd frontend
    docker build -t espetinho-app .
    docker run --rm -p 80:80 espetinho-app
    ```

- **API** (usa `backend/Dockerfile`):

    ```bash
    cd backend
    docker build -t espetinho-api .
    docker run --rm -p 4000:4000 \
      -e PGHOST=<host> -e PGUSER=<usuario> -e PGPASSWORD=<senha> -e PGDATABASE=<db> \
      espetinho-api
    ```

- **PostgreSQL + schema**

    ```bash
    docker run --name espetinho-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=espetinho -p 5432:5432 -d postgres:16
    docker exec -i espetinho-db psql -U postgres -d espetinho < backend/schema.sql
    ```

- **pgAdmin**

    ```bash
    docker build -f Dockerfile.pgadmin -t espetinho-pgadmin .
    docker run --rm -p 5050:80 \
      -e PGADMIN_DEFAULT_EMAIL=admindatony@datony.com \
      -e PGADMIN_DEFAULT_PASSWORD=Datony20025#! \
      -v pgadmin-data:/var/lib/pgadmin \
      espetinho-pgadmin
    ```

## BPMN do fluxo da aplicação

Um diagrama BPMN resumindo o fluxo do "Chama no espeto" está disponível em `docs/bpmn/chama-no-espeto.bpmn`. O arquivo segue o padrão BPMN 2.0 (pode ser aberto no Camunda Modeler, Draw.io ou semelhantes) e destaca:

- Jornada do cliente na loja pública (montagem e envio do pedido com Pix).
- Validação e criação do pedido pela API.
- Operação diária do painel interno (cadastro, catálogo, publicação da loja e fila do churrasqueiro).

## Notas adicionais

- Ao publicar em produção (ex.: EC2), exponha apenas as portas necessárias e substitua credenciais padrão.
- O diretório `.vscode/` traz recomendações de formatação (2 espaços, LF, remoção de espaços em branco e nova linha final), aplicadas automaticamente se o Prettier estiver instalado.
Vitrine e painel com Docker:

- Vitrine (cliente): `http://localhost:8080/<slug>` (ex: `http://localhost:8080/lojadoedmilson`)
- Admin pedidos: `http://localhost:8080/admin/orders`
- Fila do churrasqueiro: `http://localhost:8080/admin/queue`
