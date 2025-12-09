# Espetinho Datony

Aplicação web para pedidos e gestão do restaurante de espetinhos Datony. O projeto traz duas experiências principais:

-   **Loja do cliente**: montagem e edição do pedido, envio para WhatsApp e pagamento via chave Pix.
-   **Painel interno**: dashboard com métricas, CRUD de produtos, fila do churrasqueiro (atualização a cada 5s) e histórico de pedidos.

## Como executar

```bash
npm install
npm start
```

### Variáveis de ambiente do front-end

Configure a URL da API que fala com o PostgreSQL via variáveis de ambiente do React:

```bash
REACT_APP_API_BASE_URL=http://localhost:4000
```

## Conteinerização

### Aplicação React

O repositório inclui um `Dockerfile` multi-stage que constrói a aplicação e a serve via **nginx**. Para gerar a imagem e executá-la na porta 80:

```bash
docker build -t espetinho-app .
docker run --rm -p 80:80 espetinho-app
```

### API Node + PostgreSQL

O diretório `server/` contém uma API Express que conversa diretamente com o PostgreSQL (via `pg`). Execute a migração básica
com o script `server/schema.sql` e exponha as credenciais do banco via variáveis padrão (`PGHOST`, `PGPORT`, `PGDATABASE`,
`PGUSER`, `PGPASSWORD`). Para subir a API localmente:

```bash
cd server
npm install
PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres PGDATABASE=espetinho npm start
```

Endpoints principais:

-   `GET products` – lista produtos.
-   `POST products` – cria produto `{ name, price, category, description?, active? }`.
-   `PUT products/:id` e `DELETE products/:id` – edita ou remove.
-   `GET orders` – lista pedidos.
-   `GET orders/queue` – fila pendente/preparando.
-   `POST orders` – cria pedido `{ name, phone, address, table, type, items, total, status?, payment? }`.
-   `PATCH orders/:id/status` – atualiza status.

Para containerizar a API e conectar ao banco em EC2, use o `Dockerfile.api`:

```bash
docker build -f Dockerfile.api -t espetinho-api .
docker run --rm -p 4000:4000 \
  -e PGHOST=<host> -e PGUSER=<usuario> -e PGPASSWORD=<senha> -e PGDATABASE=<db> \
  espetinho-api
```

### pgAdmin

O arquivo `Dockerfile.pgadmin` usa a imagem oficial do pgAdmin e define credenciais padrão (alteráveis em runtime). Monte um volume para persistir dados e substitua as credenciais conforme necessário (padrão: `admindatony@datony.com` / `Datony20025#!`):

```bash
docker build -f Dockerfile.pgadmin -t espetinho-pgadmin .
docker run --rm -p 5050:80 \
  -e PGADMIN_DEFAULT_EMAIL=admindatony@datony.com \
  -e PGADMIN_DEFAULT_PASSWORD=Datony20025#! \
  -v pgadmin-data:/var/lib/pgadmin \
  espetinho-pgadmin
```

Ao subir ambas as imagens em uma instância EC2, exponha as portas desejadas (por exemplo, `80` para a aplicação e `5050` para o pgAdmin) e configure as variáveis de ambiente do pgAdmin com valores seguros.

## Workspace do VS Code

Incluímos o diretório `.vscode/` com recomendações e configurações de identação consistentes (2 espaços, final de linha LF, remoção de espaços em branco e nova linha final). O VS Code aplicará formatação automática ao salvar arquivos JavaScript/JSON/Markdown quando o Prettier estiver instalado (extensão recomendada em `.vscode/extensions.json`).

## Scripts adicionais

-   `npm run build` – gera a versão de produção.
-   `npm test` – executa a suíte de testes padrão do Create React App.

## Tecnologias

-   React (Create React App)
-   Tailwind CSS via CDN
-   Firebase Auth + Firestore
-   Lucide React
-   Recharts

## Contribuição

-   Os arquivos de texto são normalizados via `.gitattributes` para evitar que o repositório seja tratado como binário durante a criação do PR.
