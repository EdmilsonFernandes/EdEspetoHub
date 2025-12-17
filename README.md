# Espetinho Datony

Aplicação web para pedidos e gestão do restaurante de espetinhos Datony. O projeto traz duas experiências principais:

-   **Loja do cliente**: montagem e edição do pedido, envio para WhatsApp e pagamento via chave Pix.
-   **Painel interno**: dashboard com métricas, CRUD de produtos, fila do churrasqueiro (atualização a cada 5s) e histórico de pedidos.

## Visão geral do stack

-   **Front-end**: React (Create React App) servido por nginx em produção (ver `Dockerfile`).
-   **API**: Node.js/Express em JavaScript (pasta `server/`, Dockerfile `Dockerfile.api`).
-   **Banco de dados**: PostgreSQL com schema em `server/schema.sql` e recursos opcionais de administração via pgAdmin.

Requisitos mínimos para desenvolvimento local:

-   Node.js 18+ e npm/yarn
-   PostgreSQL 16+ (local) ou Docker
-   Docker + Docker Compose (para execução conteinerizada)

## Execução local (sem Docker)

### 1. Banco de dados

1. Crie um banco chamado `espetinho` e aplique o schema inicial (opcional, a API também cria tabelas on-demand):

    ```bash
    psql -h localhost -U postgres -d espetinho -f server/schema.sql
    ```

2. Variáveis de conexão usadas pelo `pg` (padrões: `postgres` / `postgres`):

    ```bash
    export PGHOST=localhost
    export PGUSER=postgres
    export PGPASSWORD=postgres
    export PGDATABASE=espetinho
    ```

### 2. API (pasta `server/`)

```bash
cd server
npm install
npm start
```

O servidor sobe em `http://localhost:4000` e, durante a inicialização:

-   valida a conexão com o PostgreSQL;
-   cria/atualiza a tabela `admin_users`;
-   garante um administrador padrão (`ownerId` `espetinhodatony`, usuário `admin`, senha `admin123`). Altere via variáveis `ADMIN_USER`, `ADMIN_PASSWORD` e `ADMIN_NAME` ou atualizando manualmente a tabela `admin_users` (por exemplo: `UPDATE admin_users SET password_hash = crypt('<nova_senha>', gen_salt('bf')) WHERE username='admin' AND owner_id='espetinhodatony';`).

Endpoints principais:

-   `POST /login` — autenticação de administradores (tabela `admin_users`).
-   `GET products`, `POST products`, `PUT products/:id`, `DELETE products/:id` — catálogo.
-   `GET orders`, `GET orders/queue`, `POST orders`, `PATCH orders/:id/status` — pedidos e fila.
-   `POST /admin/reset` — reinicia o banco e repovoa produtos padrão. Requer header `x-owner-id` e Basic Auth com usuário de `admin_users` (ex.: `curl -u admin:admin123 -H "x-owner-id: espetinhodatony" -X POST http://localhost:4000/admin/reset`).

### 3. Front-end React

```bash
npm install
npm start
```

Crie um arquivo `.env` na raiz do projeto com o endpoint da API:

```bash
REACT_APP_API_BASE_URL=http://localhost:4000
```

Com a API em execução, a loja fica acessível em `http://localhost:3000`.

### 4. pgAdmin (opcional, local)

-   Host: `localhost`
-   Porta: `5432`
-   Usuário: `postgres`
-   Senha: a que você definiu

## Execução com Docker

### Subir tudo com Docker Compose

```bash
docker compose up --build
```

Serviços expostos:

-   Front-end: http://localhost:8080
-   API: http://localhost:4000
-   PostgreSQL: porta 5432 (volume `postgres-data`)
-   pgAdmin: http://localhost:5050

Credenciais padrão do pgAdmin (pode sobrescrever via variáveis de ambiente ao subir): `admindatony@datony.com` / `Datony20025#!`.

### Imagens individuais

-   **Front-end**: constrói com nginx

    ```bash
    docker build -t espetinho-app .
    docker run --rm -p 80:80 espetinho-app
    ```

-   **API**: utiliza `Dockerfile.api`

    ```bash
    docker build -f Dockerfile.api -t espetinho-api .
    docker run --rm -p 4000:4000 \
      -e PGHOST=<host> -e PGUSER=<usuario> -e PGPASSWORD=<senha> -e PGDATABASE=<db> \
      espetinho-api
    ```

-   **PostgreSQL + schema**

    ```bash
    docker run --name espetinho-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=espetinho -p 5432:5432 -d postgres:16
    docker exec -i espetinho-db psql -U postgres -d espetinho < server/schema.sql
    ```

-   **pgAdmin**

    ```bash
    docker build -f Dockerfile.pgadmin -t espetinho-pgadmin .
    docker run --rm -p 5050:80 \
      -e PGADMIN_DEFAULT_EMAIL=admindatony@datony.com \
      -e PGADMIN_DEFAULT_PASSWORD=Datony20025#! \
      -v pgadmin-data:/var/lib/pgadmin \
      espetinho-pgadmin
    ```

## Notas adicionais

-   Ao publicar em produção (ex.: EC2), exponha apenas as portas necessárias e substitua credenciais padrão.
-   O diretório `.vscode/` traz recomendações de formatação (2 espaços, LF, remoção de espaços em branco e nova linha final), aplicadas automaticamente se o Prettier estiver instalado.
