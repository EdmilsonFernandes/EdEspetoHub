# Agent bootstrap

Este arquivo orienta agentes de IA que entram no repositorio sem conhecer o contexto do projeto. Ele nao substitui `.ai/agent-rules.md`; quando esse arquivo existir, ele continua sendo a regra operacional principal.

## Leitura obrigatoria antes de agir

1. `.ai/agent-rules.md`
2. `README.md`
3. `docs/SQL_CONSULTAS_MANUTENCAO.md` quando a tarefa envolver banco
4. `backend/docs/MIGRATION_STANDARD.md` quando a tarefa envolver schema, DDL, migrations, tabelas, colunas, indices ou constraints
5. `docs/TESTING_GUIDE.md` quando a tarefa envolver testes
6. `docs/SERVIDOR_PRODUCAO.md` quando a tarefa envolver producao, EC2, Docker, backup ou deploy
7. `docs/DISASTER_RECOVERY_RUNBOOK.md` quando a tarefa envolver indisponibilidade, restore, migracao, banco perdido, SSL, e-mail ou recuperacao total

## Resumo do projeto

Ja no Caminho e uma plataforma web/mobile para marketplace local, pedidos, lojas, pagamentos, entregas por motoboy, condominios e destinos turisticos.

Servicos principais:

- `frontend/`: React/Vite/PWA/Capacitor.
- `apis/`: BFF Express, rotas intermediarias e proxy para o backend.
- `backend/`: API principal Express/TypeORM/PostgreSQL.
- `face-worker/`: verificacao assistida de documentos.
- `mobile/`: Android/Capacitor e geracao de AAB.

Fluxo de chamadas:

- Browser/app chama `/api/...`.
- Nginx entrega frontend e encaminha `/api/*` para `janocaminho-apis`.
- `apis/` encaminha rotas ao backend quando nao tem logica propria.
- `backend/` persiste dados, roda migrations, jobs, uploads, pagamentos, MFA e push.

## Regras praticas

- Nao refatorar rotas, autenticacao ou regras de negocio sem pedido claro.
- Nao commitar arquivos de segredo, `.env`, chaves, `.pem`, `.jks`, `.apk` ou `.aab`.
- Nao executar deploy no EC2; o usuario faz deploy.
- Mudanca em `backend/` exige `cd backend && yarn test`.
- Mudanca de schema nova deve seguir `backend/docs/MIGRATION_STANDARD.md`: criar migration versionada em `backend/src/migrations/**`, registrar em `backend/src/migrations/index.ts`, atualizar `backend/schema.sql` e regenerar `backend/docs/database-schema.html`.
- Mudanca frontend exige validar build/teste conforme escopo.
- Preserve alteracoes nao relacionadas existentes no working tree.

## MCP recomendado

Quando o cliente/ambiente oferecer MCP:

- Use MCP de banco apenas para leitura/investigacao, preferencialmente com usuario read-only.
- Use MCP de GitHub/Git workflow para consultar Actions, commits, branches e PRs, sem substituir comandos locais obrigatorios.
- Nunca coloque tokens ou senhas em arquivos versionados.
- Use `.mcp.example.json` como exemplo e configure segredos fora do Git.

## Consultas e manutencao

O guia principal de consultas fica em:

- `docs/SQL_CONSULTAS_MANUTENCAO.md`

Ele cobre usuarios, clientes, lojas, motoboys, pedidos, produtos, MFA, push tokens, planos, banners, destinos, pagamentos e diagnosticos comuns.
