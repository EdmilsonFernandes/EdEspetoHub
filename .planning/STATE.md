# STATE — onde paramos

> Última etapa de TODO trabalho: atualizar este arquivo. Transitório fica na
> conversa; permanente vem pra cá (ou vira ADR se for decisão).

## Foco atual

Organização da "Claude Dev Platform" (roteiro §5 do diagnóstico) + pilotagem
do orchestrator. Produto estável em `gha.2617` (29/08 à noite).

## Últimos fechados

- 29/08 — Menu admin unificado em fonte única (`adminNavigation.ts` + `useAdminNav`);
  desktop desde 768px; ☰ "Menu" em destaque; bottom nav sem hide-on-scroll;
  Conta enxuta; KPI na dobra. Deploy `gha.2617`, commits até `5c5ea43c`.
- 29/08 — AAB **v117** gerado (46MB, SHA1 `CA:AB:50` ✓, assets conferidos) —
  aguardando upload do Edmilson no Play (v115/v116 descartados).
- 29/08 — Base de conhecimento `docs/claude-platform/` (playbook+templates+diagnóstico).
- 28/08 — Preços 2 planos + VIP Fundador no ar (e6055053).

## Em andamento / em risco

- AAB v117: falta subir no Play (Edmilson) — atenção ao exigência 16 KB page size.
- Orchestrator `.claude/agents/`: instalado, em pilotagem (1 semana antes de podar skills).
- Sessão paralela ativa no repo (balcão/Point): conferir `git log` antes de assumir estado.

## Próximos

1. Pilotar orchestrator + STATE numa tarefa real (a próxima feature entra por ele).
2. Poda de skills/MCP (global 286→~30) — só depois da semana de pilotagem.
3. Backlog produto: cobrança Point via pipeline Payment (spec pronta),
   pedidos offline staff (retomar com sdd-specify), DevicePermissionsCard (teal/border-l-4).

## Decisões pendentes

- Remover notificação FGS do Modo Balcão (v79+) → decide Edmilson.
- CTA verde × laranja no consumidor → registrado, não decidido.
