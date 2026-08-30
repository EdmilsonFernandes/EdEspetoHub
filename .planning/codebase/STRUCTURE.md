# STRUCTURE

```
EdEspetoHub/
├── frontend/          React+Vite (src/pages, components, navigation/, contexts/)
├── backend/           Express+TypeORM (src/services, migrations/, keys/)
├── apis/              BFF (proxy/contratos p/ o frontend)
├── mobile/            Capacitor (android/; versionCode em app/build.gradle)
├── face-worker/       FastAPI (biometria motoboy — dado sensível LGPD)
├── .planning/         ESTE sistema (STATE/ROADMAP/codebase)
├── .claude/           skills do domínio, agents/, rules, hooks (graphify-guard)
├── .ai/               regras operacionais profundas (SKILL.md, agent-rules.md, sdd/)
├── docs/              decisions/ (ADRs), claude-platform/, guias
├── specs/             especificações SDD (<feature>/requirements|design|tasks)
├── .ux-audit/         auditorias + scripts playwright de prod (queue-card-audit etc.)
├── graphify-out/      knowledge graph (query/path/explain)
└── marketing/         screenshots reais + roteiros B2B
```

Deuses do código (god nodes, tocar com plano): `AdminDashboard.tsx` (~4k L),
`GrillQueue.tsx` (~5k L), `DashboardView.tsx` (~2.4k L) — todos `@ts-nocheck`
(TDZ já quebrou prod 2×; helpers precisam nascer ANTES dos efeitos que usam).
