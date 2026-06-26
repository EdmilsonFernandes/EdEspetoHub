# Startup Sequence — EdEspetoHub (Já no Caminho)

> Sequência obrigatória ao iniciar qualquer conversa, **antes de alterar código**.
> Plataforma web/mobile de marketplace local: pedidos, lojas, pagamentos, entregas por motoboy, condomínios e destinos turísticos.

## PASSO 1 — Graphify (mapear o projeto)
- Grafo já existe em `graphify-out/graph.json` (versionado).
- Skill Graphify instalada em `.claude/skills/graphify` — trigger `/graphify` (qualquer entrada vira consulta ao knowledge graph).
- Usar para enxergar: serviços, rotas, controllers, entidades TypeORM, componentes, jobs, integrações.
- **Nota de realidade:** CLI = `path`/`explain`/`diagnose multigraph` (sem `query`). Ver `.claude/GRAPH_RULES.md`.

## PASSO 2 — Serena (indexar o que importa)
- Projeto configurável em `.serena/project.yml`.
- Visão geral simbólica (`get_symbols_overview`) → `find_symbol` (body) só do que for tocar. Referências: `find_referencing_symbols`.

## PASSO 3 — Leitura obrigatória conforme a tarefa (bootstrap do agente)
- `.ai/agent-rules.md` — **regra operacional principal** (sempre).
- `README.md` — visão geral.
- Banco/SQL → `docs/SQL_CONSULTAS_MANUTENCAO.md`.
- Schema/migrations/DDL → `backend/docs/MIGRATION_STANDARD.md`.
- Testes → `docs/TESTING_GUIDE.md`.
- Produção/EC2/Docker/deploy → `docs/SERVIDOR_PRODUCAO.md`.
- Indisponibilidade/restore/recuperação → `docs/DISASTER_RECOVERY_RUNBOOK.md`.
- Demais docs de domínio em `docs/` (DESTINATION_HUB, CONDOMINIUM_HUB_PLAN, DELIVERY, FACE_VERIFY, BACKEND_JOBS, etc.) — ler o relevante à tarefa.

## PASSO 4 — Relatório de inicialização
Antes de executar alterações, resumir: escopo entendido, arquivos/serviços impactados (com `file:line`), impacto (frontend/backend/apis/mobile/face-worker/db), plano em tarefas, riscos.

## ⚠️ Estado atual das ferramentas (realidade)
| MCP | Status | Observação |
|---|---|---|
| **Graphify** | ✅ Funciona | Grafo existe; skill `/graphify`; CLI `path`/`explain`/`diagnose`. |
| **Serena** | ✅ Configurável | `.serena/project.yml` presente. |
| **GSD** | ⚠️ Sem API key | CLI presente, erro "No API key found". Rodar `gsd`/`/login` no terminal do user. Fallback: tasks nativas (TaskCreate/TaskUpdate). |
| **Context7** | ✅ Funciona | Docs de libs (React, Express, TypeORM, FastAPI, Tailwind) sob demanda. |

> **Regra:** não executar alteração de código antes do relatório (Passo 4).
