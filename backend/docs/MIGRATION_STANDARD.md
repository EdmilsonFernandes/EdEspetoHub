# Padrao de migrations do backend

Este backend ainda mantem um bloco legado idempotente em `src/utils/runMigrations.ts`.
A partir deste padrao, toda mudanca nova de schema deve entrar como migration versionada em
`src/migrations`.

## Objetivo

- Permitir subir banco do zero com `schema.sql`.
- Permitir evoluir bancos existentes com migrations rastreadas.
- Bloquear alteracao acidental de migration ja aplicada por checksum.
- Evitar duas instancias aplicando DDL ao mesmo tempo usando advisory lock do PostgreSQL.
- Manter compatibilidade com o startup atual, seeds e scripts existentes.

## Fluxo atual

1. O app garante que o database exista.
2. Se o banco estiver vazio, `schema.sql` cria a base.
3. `runMigrations.ts` executa o bloco legado idempotente.
4. O novo runner executa as migrations em `src/migrations`.
5. Cada migration aplicada e registrada em `app_schema_migrations`.

O primeiro registro e `20260613_000_baseline_current_schema`. Ele nao altera tabelas;
apenas valida que tabelas centrais existem antes de marcar o marco inicial.

## Criando uma nova migration

Use o formato:

```text
backend/src/migrations/YYYYMMDD_NNN_nome_curto.ts
```

Exemplo:

```ts
import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260613_001_create_customer_notes',
  name: 'Create customer notes',
  checksumSource: `
    CREATE TABLE customer_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL,
      note TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL,
        note TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  },
};

export default migration;
```

Depois registre no `backend/src/migrations/index.ts`:

```ts
import baselineCurrentSchema from './20260613_000_baseline_current_schema';
import createCustomerNotes from './20260613_001_create_customer_notes';

export const schemaMigrations = [baselineCurrentSchema, createCustomerNotes] as const;
```

## Regras

- Nao edite uma migration que ja rodou em qualquer ambiente compartilhado. Crie outra migration.
- Use `checksumSource` estavel para representar a mudanca de schema. Isso evita checksum variar por formatacao de funcao.
- Migrations rodam em transacao por padrao.
- Use `transaction: false` apenas quando o PostgreSQL exigir, por exemplo `CREATE INDEX CONCURRENTLY`.
- DDL novo deve ficar em `src/migrations/**`. O teste de governanca bloqueia DDL espalhado em services, repositories ou controllers.
- Mudanca de schema exige atualizar `backend/docs/database-schema.html`.
- Antes de producao, valide com banco local vazio e com banco restaurado de dump.

## Comandos locais

Status:

```bash
cd backend
yarn migrate:status
```

Aplicar migrations:

```bash
cd backend
yarn migrate
```

Testes obrigatorios para mudanca de backend:

```bash
cd backend
yarn test
```

Atualizar documentacao do schema:

```bash
cd backend
npm run docs:schema
```

## Validacao cautelosa antes de producao

1. Confirmar backup/dump recente e restauravel.
2. Subir ambiente local limpo.
3. Aplicar `schema.sql` e migrations via startup ou `yarn migrate`.
4. Restaurar dump em outro banco local.
5. Rodar `yarn migrate` contra o banco restaurado.
6. Conferir `yarn migrate:status`: `pending` deve ficar vazio.
7. Rodar `yarn test`.
8. Gerar e revisar `backend/docs/database-schema.html`.

## Rollback

Este padrao e forward-only: nao existe `down` automatico.

Para erro antes de merge ou antes de rodar em ambiente compartilhado, ajuste a migration.
Para erro depois de aplicada, crie uma nova migration corrigindo o schema. Em producao,
qualquer restauracao de backup deve seguir o runbook de desastre antes de religar o app.
