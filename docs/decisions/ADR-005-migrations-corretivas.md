# ADR-005 — Migrations TypeORM: sempre corretiva, nunca editar aplicada

2026 · aceito (padrão `backend/docs/MIGRATION_STANDARD.md`)

## Context

Edições em migrations já aplicadas em produção divergem o schema local do
produtivo silenciosamente — a classe de bug mais cara do projeto.

## Decision

Mudança de schema = NOVO arquivo `backend/src/migrations/YYYYMMDD_NNN_nome.ts`,
registrado em `index.ts` (não registrado = não roda). Migration aplicada é
intocável.

## Reason

- Histórico linear auditável; rollback previsível.
- Migrations rodam no boot do container (sem passo manual no deploy).

## Consequences

- Toda migration vem com: atualização do `schema.sql` + regenerar
  `docs/database-schema.html`.
- Gate de deploy: `migrate:status` com 0 pending + suite verde.
- Erros de API não-tratados aparecem como `Unhandled error returned to client`
  nos logs (desde 13/08/2026).
