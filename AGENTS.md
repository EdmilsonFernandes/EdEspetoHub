# AGENTS.md (ponteiro)

> O **bootstrap** e os **papéis dos agentes/MCPs** foram absorvidos pelo framework `.claude/`.
> A **regra operacional principal** continua em `.ai/agent-rules.md`.

## Onde encontrar cada coisa
- **Bootstrap / inicialização** → [`.claude/STARTUP.md`](.claude/STARTUP.md) — leituras obrigatórias + estado real dos MCPs.
- **Papéis dos MCPs** (Graphify/Serena/GSD/Context7) → [`.claude/AGENTS.md`](.claude/AGENTS.md).
- **Pipeline de tarefa + validação** → [`.claude/TASK_RULES.md`](.claude/TASK_RULES.md).
- **Arquitetura / Design / Grafo** → `.claude/ARCHITECTURE.md`, `.claude/DESIGN_SYSTEM.md`, `.claude/GRAPH_RULES.md`.
- **Regra operacional principal (ops profundo)** → `.ai/agent-rules.md`.
- **Consultas SQL / produção / disaster recovery** → `docs/` (`SQL_CONSULTAS_MANUTENCAO.md`, `SERVIDOR_PRODUCAO.md`, `DISASTER_RECOVERY_RUNBOOK.md`).

## Resumo do projeto (1 linha)
**Já no Caminho** — marketplace local (pedidos, lojas, pagamentos, entregas por motoboy, condomínios, destinos turísticos). Serviços: `frontend/` (React/Vite/Tailwind/Capacitor), `apis/` (BFF Express), `backend/` (Express/TypeORM/PostgreSQL/Redis), `face-worker/` (Python FastAPI), `mobile/` (Capacitor/AAB). Fluxo: Browser → Nginx → frontend / `/api` → BFF → backend.
