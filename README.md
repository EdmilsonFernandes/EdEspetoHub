# EdEspetoHub (JaNoCaminho)

Aplicação web para pedidos e gestão do restaurante de espetinhos. O projeto traz duas experiências principais:

- **Loja do cliente**: montagem e edição do pedido, info da loja no mobile, WhatsApp e link de acompanhamento.
- **Painel interno**: dashboard com métricas, CRUD de produtos, fila do churrasqueiro, pagamentos e histórico.

## Arquitetura do Backend

O backend foi modernizado para uma arquitetura **Class-Driven e IoC-powered** utilizando **InversifyJS** e **TypeORM**.

### Pilares Principais:
- **IoC (Inversion of Control)**: Gerenciamento de dependências via containers, garantindo desacoplamento e testabilidade.
- **DAO Pattern**: Acesso a dados padronizado via `GenericDao<DTO, Entity>`, separando completamente a estrutura do banco da lógica da aplicação.
- **DTO Mapping**: Sistema customizado de mapeamento utilizando decoradores `@DtosEntity` e `@DtoAttr` para garantir contratos de dados estritos.
- **Auto-Discovery**: Registro automático de Controllers, Services e DAOs via scan de arquivos.
- **BaseController**: Roteamento declarativo via decoradores (`@Get`, `@Post`, `@Authorize`, etc).

## Estrutura de Pastas

- `frontend/`: Aplicação React (Vite).
- `backend/`: API Node.js/Express + TypeORM em TypeScript.
  - `src/controllers/`: Camada de apresentação e rotas.
  - `src/services/`: Camada de regras de negócio.
  - `src/database/dao/`: Camada de persistência (DAOs).
  - `src/models/dtos/`: Contratos de transferência de dados.
  - `src/entities/`: Entidades do TypeORM.
  - `src/ioc/`: Configuração do container de Inversão de Controle.
  - `tests/`: Pasta dedicada para testes automatizados.

## Padrão de Desenvolvimento

### Backend:
- **Decoradores**: Use `@Provide` para registrar classes e `@Inject` para injetar dependências no construtor.
- **Controllers**: Devem estender `BaseController` e usar `@RouterController`.
- **DAOs**: Devem estender `GenericDao` e possuir um DTO associado.
- **Documentação**: Todo arquivo deve conter o cabeçalho CONFIDENTIAL e TSDoc em inglês.

## Como Rodar

### Docker Compose (Recomendado)
```bash
docker compose up --build
```

### Local (Desenvolvimento)
1. Instale as dependências: `npm install` no backend e frontend.
2. Configure o banco PostgreSQL.
3. Configure os arquivos `.env` baseados nos arquivos `.example`.
4. Inicie o backend: `cd backend && npm run dev`
5. Inicie o frontend: `cd frontend && npm run dev`

---
© 2025-2026 Chama no espeto - Todos os direitos reservados.
