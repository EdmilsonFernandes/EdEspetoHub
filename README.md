# Espetinho Datony

Aplicação web para pedidos e gestão do restaurante de espetinhos Datony. O projeto traz duas experiências principais:

- **Loja do cliente**: montagem e edição do pedido, envio para WhatsApp e pagamento via chave Pix.
- **Painel interno**: dashboard com métricas, CRUD de produtos, fila do churrasqueiro (atualização a cada 5s) e histórico de pedidos.

## Execução local

### Front-end React

```bash
npm install
npm start
```

Variáveis de ambiente do React (arquivo `.env` na raiz):

```bash
REACT_APP_API_BASE_URL=http://localhost:4000
```

### API Node + PostgreSQL (local)

1. Instale dependências e carregue o schema (opcional) no PostgreSQL local:

   ```bash
   cd server
   npm install
   psql -h localhost -U postgres -d espetinho -f schema.sql
   ```

2. Exponha as variáveis padrão do `pg` e inicie a API:

   ```bash
   PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres PGDATABASE=espetinho npm start
   ```

Principais endpoints:

- `GET /api/products` – lista produtos.
- `POST /api/products` – cria produto `{ name, price, category, description?, active? }`.
- `PUT /api/products/:id` e `DELETE /api/products/:id` – edita ou remove.
- `GET /api/orders` – lista pedidos.
- `GET /api/orders/queue` – fila pendente/preparando.
- `POST /api/orders` – cria pedido `{ name, phone, address, table, type, items, total, status?, payment? }`.
- `PATCH /api/orders/:id/status` – atualiza status.

### pgAdmin (local)

Instale pgAdmin localmente ou utilize a imagem oficial. Para conectar ao banco local, crie um novo servidor no pgAdmin com:

- **Host**: `localhost`
- **Porta**: `5432`
- **Usuário**: `postgres`
- **Senha**: a que você definiu

## Conteinerização

### Aplicação React (Docker)

O repositório inclui um `Dockerfile` multi-stage que constrói a aplicação e a serve via **nginx**. Para gerar a imagem e executá-la na porta 80:

```bash
docker build -t espetinho-app .
docker run --rm -p 80:80 espetinho-app
```

### API Node + PostgreSQL (Docker)

Use o `Dockerfile.api` para empacotar a API. Você pode apontar para um banco externo ou para um container do PostgreSQL:

```bash
docker build -f Dockerfile.api -t espetinho-api .
docker run --rm -p 4000:4000 \
  -e PGHOST=<host> -e PGUSER=<usuario> -e PGPASSWORD=<senha> -e PGDATABASE=<db> \
  espetinho-api
```

Caso queira tudo em containers, suba também um PostgreSQL oficial (exemplo com senha `postgres`):

```bash
docker run --name espetinho-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=espetinho -p 5432:5432 -d postgres:16

# Popular schema opcionalmente
docker exec -i espetinho-db psql -U postgres -d espetinho < server/schema.sql

# API apontando para o container do banco
docker run --rm -p 4000:4000 --link espetinho-db \
  -e PGHOST=espetinho-db -e PGUSER=postgres -e PGPASSWORD=postgres -e PGDATABASE=espetinho \
  espetinho-api
```

### pgAdmin (Docker)

O arquivo `Dockerfile.pgadmin` usa a imagem oficial do pgAdmin. Monte um volume para persistir dados e configure credenciais seguras (padrão: `admindatony@datony.com` / `Datony20025#!`):

```bash
docker build -f Dockerfile.pgadmin -t espetinho-pgadmin .
docker run --rm -p 5050:80 \
  -e PGADMIN_DEFAULT_EMAIL=admindatony@datony.com \
  -e PGADMIN_DEFAULT_PASSWORD=Datony20025#! \
  -v pgadmin-data:/var/lib/pgadmin \
  espetinho-pgadmin
```

Para conectar o pgAdmin ao PostgreSQL containerizado, adicione um novo servidor com host `espetinho-db`, porta `5432`, usuário `postgres` e senha `postgres` (ou os valores que você tiver configurado). Em produção, exponha apenas as portas necessárias (por exemplo, `80` para a aplicação e `5050` para o pgAdmin) e altere as credenciais padrão.

## Workspace do VS Code

Incluímos o diretório `.vscode/` com recomendações e configurações de identação consistentes (2 espaços, final de linha LF, remoção de espaços em branco e nova linha final). O VS Code aplicará formatação automática ao salvar arquivos JavaScript/JSON/Markdown quando o Prettier estiver instalado (extensão recomendada em `.vscode/extensions.json`).

## Scripts adicionais

- `npm run build` – gera a versão de produção.
- `npm test` – executa a suíte de testes padrão do Create React App.

## Tecnologias

- React (Create React App)
- Tailwind CSS via CDN
- Firebase Auth + Firestore
- Lucide React
- Recharts

## Contribuição
- Os arquivos de texto são normalizados via `.gitattributes` para evitar que o repositório seja tratado como binário durante a criação do PR.
