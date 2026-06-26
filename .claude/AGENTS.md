# Agentes / MCPs — Papéis (EdEspetoHub)

Pipeline fixa (ideal): **Graphify → Serena → GSD → Context7 → Implementar → Testar → Atualizar Grafo**.

> **Regra operacional principal** continua em `.ai/agent-rules.md` (498 linhas, ops profundo).
> Este arquivo define o **papel de cada MCP** + o **estado real** de cada ferramenta.

---

## 🕸 Graphify — Entender a arquitetura (multi-serviço)
- **Sempre executa primeiro.** Mapeia frontend/backend/apis/mobile/face-worker e suas dependências.
- Responde "quem usa / quem depende / existe duplicação?" antes de eu tocar.
- **Realidade:** grafo em `graphify-out/`; skill `/graphify`; CLI `path`/`explain`/`diagnose`. Ver `.claude/GRAPH_RULES.md`.

## 🔍 Serena — Localizar e editar código (semântica)
- **Nunca editar arquivos de código sem Serena.** Símbolos, body, referências, edição simbólica.
- **Realidade:** projeto em `.serena/project.yml`. Ativar o projeto correto se necessário.

## 📋 GSD — Planejar (milestones / slices / tasks)
- **Nunca executar tarefas grandes sem planejamento.** `gsd` no terminal gera o plano.
- **Realidade:** CLI sem API key → erro "No API key found". User roda `gsd`/`/login`. **Fallback:** tasks nativas + `EnterPlanMode`.

## 📚 Context7 — Documentação oficial de libs
- **Nunca assumir APIs** de React/Express/TypeORM/Tailwind/FastAPI de cabeça. Consultar quando houver dúvida.
- **Realidade:** MCP funcional, sob demanda.

---

## Na prática
1. **Graphify** — impacto/dependências entre serviços.
2. **Serena** — símbolo exato, body, referências, edição.
3. **GSD** (ou tasks nativas) — dividir e aprovar plano.
4. **Context7** — só quando uma API de lib estiver em dúvida.
5. **Implementar** — Serena para editar; validar (`yarn test` backend / build frontend).
6. **Atualizar o grafo** após mudanças estruturais.

> Se um MCP estiver indisponível (ex.: GSD sem key), usar o equivalente e **anotar** o fallback — não travar.
