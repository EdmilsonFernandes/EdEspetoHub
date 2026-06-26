# Task Rules — Como executar tarefas (EdEspetoHub)

Toda tarefa segue **exatamente** esta sequência.

```
1. Graphify        — entender impacto/dependências entre serviços antes de tocar
2. Analisar impacto — frontend/backend/apis/mobile/face-worker/db? risco cruzado?
3. Serena          — localizar arquivos/símbolos exatos
4. GSD             — dividir em tarefas (ou tasks nativas se GSD sem key)
5. Context7        — só se uma API de lib estiver em dúvida
6. Implementar     — Serena para editar; no padrão do entorno
7. Atualizar Graphify — após mudanças estruturais
8. Testes          — yarn test (backend) / build (frontend) / migrate:status
9. Relatório       — commit hash, escopo, arquivos, o que rodar
```

## Regra de "tarefa concluída"
Só está concluída quando:
1. Código alterado.
2. **Validado** (`yarn test` backend verde; `npm run build` frontend OK; `migrate:status` 0 pending se tocou schema).
3. **Commit + push** feitos (quando o user pedir — nunca commitar sem ordem; **nunca deployar via SSH**).
4. User informado: **commit hash + escopo (frontend/backend/apis/mobile/face-worker/db) + o que rodar**.

> **Nunca** dizer "concluído" sem validar. **Nunca** esconder erro.

## Validação OBRIGATÓRIA antes de commitar
| Mudança | Comando |
|---|---|
| Backend | `cd backend && yarn test` (100% verde antes de commit) |
| Frontend | `cd frontend && npm run test:unit && npm run build` |
| Migration | `cd backend && npm run migrate:status` (0 pending) + `yarn test` |
| Mobile | `npm --prefix frontend run build && npm --prefix mobile run android:sync` |

- **NUNCA** rodar E2E contra o banco de produção.
- **NUNCA** editar migration já aplicada — criar nova corretiva (ver `backend/docs/MIGRATION_STANDARD.md`).

## Build mobile (APK/AAB)
- **versionCode +1 SEMPRE** antes de AAB (`mobile/android/app/build.gradle`).
- `cd mobile/android && ./gradlew.bat clean bundleRelease` (sempre `clean` antes — evita Java heap space).

## Deploy (o usuário faz — com approval)
- Push na `main` → GHCR (CI builda). Deploy via `deploy-production.yml` (com approval) ou `scripts/deploy-release-*.sh`.
- **NÃO** rodar deploy/git pull no EC2 via SSH proativamente.

## Princípios / Proibições
- **Não refatorar** rotas, autenticação ou regras de negócio sem pedido claro.
- **Não commitar** secrets/`.env`/keys/`.pem`/`.jks`/`.apk`/`.aab`.
- **Não executar deploy** no EC2; o usuário faz.
- **Preservar** alterações não relacionadas já existentes no working tree.
- **Sempre informar** commit + escopo + o que rodar.

## Ops profundo
SQL de manutenção, disaster recovery, produção EC2, jobs → `.ai/SKILL.md` + `.ai/agent-rules.md` + `docs/` (SQL_CONSULTAS_MANUTENCAO, SERVIDOR_PRODUCAO, DISASTER_RECOVERY_RUNBOOK, BACKEND_JOBS).
