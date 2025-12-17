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
- `POST /api/auth/login` — autenticação de administradores.
- `GET /api/stores/:slug`, `PUT /api/stores/:id`, `PUT /api/stores/:id/status` — gerenciamento de loja.
- `GET /api/stores/:storeId/products`, `POST /api/stores/:storeId/products` — catálogo.
- `GET /api/stores/:storeId/orders`, `POST /api/stores/:storeId/orders` — pedidos e fila.

### 3. Front-end React (pasta `frontend/`)

```bash
cd frontend
npm install
npm start
```

Crie um arquivo `.env` (ou use `.env.production`) na pasta `frontend/` com o endpoint da API:

```bash
REACT_APP_API_BASE_URL=http://localhost:4000
```

Com a API em execução, a loja fica acessível em `http://localhost:3000`.

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

Credenciais padrão do pgAdmin (pode sobrescrever via variáveis de ambiente ao subir): `admindatony@datony.com` / `Datony20025#!`.

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

## Notas adicionais

- Ao publicar em produção (ex.: EC2), exponha apenas as portas necessárias e substitua credenciais padrão.
- O diretório `.vscode/` traz recomendações de formatação (2 espaços, LF, remoção de espaços em branco e nova linha final), aplicadas automaticamente se o Prettier estiver instalado.
