# Painel do Lojista V2 — Plano e Matriz de Cobertura

> Branch `feat/dashboard-v2` (worktree `EdEspetoHub-dashboard-v2`, base `origin/main` 8a9e088a).
> Objetivo: `/admin/dashboardV2` — versão completa do painel em linguagem ReUI
> (referência favorita: **tempo-tasks.reui.io**), sem tocar na V1 (`/admin/dashboard`).

## Decisões

1. **Referência visual**: tempo-tasks (Home = KPIs + gráficos + tabela; Board = kanban;
   drawers laterais). Shell base: bloco ReUI `app-shell-2` (sidebar shadcn colapsável,
   grupos aninhados, cmd-K, breadcrumb) adaptado à marca JNC (azul `#2563EB`, CTA verde
   `#15803d`, ícones Phosphor). Blocos já vendados no repo: `dashboard-7`, `data-grid`,
   `kanban-board-2`, `kanban`, `frame`, `badge`, `list-5`.
2. **Rotas reais** (deep-link, refresh, voltar/avançar): `/admin/dashboardV2/*` com
   rotas aninhadas internas, guard `AdminRoute` (ADMIN/OPERATOR/LOJISTA, fallback
   `/admin/queue`), inseridas ANTES do catch-all `/admin/*` (App.tsx:337).
3. **Menu**: deriva de `getAdminNavItems` (fonte canônica `adminNavigation.ts`, contrato
   congelado por teste) → mapa id→rota V2 em `adminV2Routes.ts`. Papéis e gates
   (motoboys Pro/VIP; OPERATOR reduzido) preservados pela própria fonte.
4. **Camadas**: V2 reescreve shell + telas de uso diário (Resumo, Fila, Histórico);
   seções de cauda longa **reusam os componentes funcionais existentes** (self-contained,
   props-driven) dentro do shell V2 com header V2 — zero duplicação de regra de negócio.
   Views embutidas no AdminDashboard.tsx (assinatura/gateway) viram composições V2
   finas sobre os MESMOS services (sem regra nova; pagamentos não são reimplementados).
5. **Sem redirects** V1→V2. V1 intocada (teste de paridade do menu continua verde).

## Matriz de cobertura (item de menu → rota V2 → implementação → validação)

| Item (adminNavigation) | Rota V2 | Implementação | Validação |
|---|---|---|---|
| resumo | `/` (index) | Nova: KPIs reais (dashboard-analytics) + gráficos + pendências + fila recente | E2E mock + visual 375/1280 |
| fila (Gestor de Pedidos) | `/fila` | Nova: kanban-board-2 adaptado (colunas por status, drag=updateStatus, SLA chip), polling fetchQueue 1.5s, sheet de detalhe com ações reais (avançar/cancelar/imprimir/cobrar/postal/reabrir) | E2E mock (ações) + visual |
| pedidos (Histórico) | `/pedidos` | Nova: data-grid + filtros status/data/busca + paginação + sheet detalhe + ações (reembolso/negar, ver pagamento, cobrar, export CSV) | E2E mock + visual |
| avaliacoes | `/avaliacoes` | Nova sobre services existentes: resumo+distribuição+lista+resposta; gating Pro entrega/gorjeta | E2E mock |
| produtos | `/produtos` | Wrap `ProductManager` (self-contained) + header V2 | E2E render + smoke |
| estoque | `/estoque` | Wrap `InventoryManager` + header V2 | E2E render |
| cardapio (Loja Online) | link externo `/{slug}` | Menu item target _blank | E2E link |
| destaques | `/destaques` | Wrap `AdminHighlights` (standalone) + header V2 | E2E render |
| cupons | `/cupons` | Wrap `AdminCoupons` embedded + header V2 | E2E render |
| destinos | `/destinos` | Wrap `StoreDestinationPanel` + header V2 | E2E render |
| condominios | `/condominios` | Wrap `StoreCondominiumPanel` + header V2 | E2E render |
| pagamentos (Assinatura e plano) | `/assinatura` | Nova composição: status assinatura + PlanBadge/Fundador + histórico pagamentos + ciclo delivery-billing (mesmos services) + planos/renewal | E2E mock |
| gateway (Pagamentos online) | `/gateway` | Nova composição: OAuth MP conforme estado real (`connected`/`oauthConfigured`/validation), capacidades Pix/crédito/débito, Point terminals | E2E mock |
| motoboys (Entregadores) | `/motoboys` | Wrap `AdminMotoboys` + gate plano Pro/VIP | E2E render + gate |
| usuarios | `/usuarios` | Wrap `StoreUsersPanel` | E2E render |
| config + cfg-* | `/config/:section?` | Hub V2 com `BrandingSettings` (perfil/canais/entrega), `OrderTypeSettingsCard`, `OpeningHoursCard`, `ThermalPrinterSettingsCard`, `DevicePermissionsCard` + save bar dirty | E2E render + save |
| renewal (Trocar assinatura) | `/assinatura` (âncora planos) | Dentro de assinatura | E2E |
| password / mfa / logout | drawer Conta no shell | Modal troca senha (authService) + `AccountMfaPanel` + logout | E2E |
| SuperAdmin | **fora da V2** (é outra superfície) | — | — |

## Estados obrigatórios em toda região de dados
loading (Skeleton no layout real) · vazio (Empty + 1 ação) · erro (inline + Retry) ·
acesso restrito (por papel/plano, com CTA claro). Sem métricas fictícias.

## Gates
- `npm --prefix frontend run test:unit` (inclui paridade adminNavigation — V1 intacta)
- `npm --prefix frontend run build` (tsc + vite; conferir bundle)
- `npm --prefix frontend run lint`
- Playwright: specs novos em `frontend/tests/e2e/dashboard-v2/*.spec.ts` (padrão
  adminSession mock já usado em admin-printer-settings.spec.ts) + regressão V1
- Visual QA 375px/1280px (screenshots)
- Deploy: push → workflow com approval (Edmilson); smoke read-only nos 2 URLs

## Fora de escopo / salvaguardas
- Nenhuma mudança em regras de pagamento (Asaas/OpenPix/MP) — só representação fiel.
- Sem migration, sem mudança de backend/BFF (rotas de página são client-side).
- GrillQueue/AdminDashboard/AdminOrders permanecem para a V1 — não são editados.

## Resultado da validação (31/10/2026, commits 3d438c38 + 56efd418)

| Gate | Resultado |
|---|---|
| tsc (`npx tsc --noEmit`) | 0 erros |
| Build produção (`npm run build`) | verde (3m07s; chunks V2 code-splitted, ex.: PedidosSection 66KB gzip) |
| Unit (`vitest run`) | **232/232** (inclui paridade do menu V1 + 7 testes novos do mapa de rotas) |
| E2E V2 (Chrome mobile) | **10/10** — auth, deep-link+refresh, voltar/avançar, 8 seções, OPERATOR, board com PATCH real, overflow 390px, regressão V1 |
| E2E V2 (Safari mobile) | **10/10** |
| QA visual (390/1280) | 20 screenshots inspecionadas, sem overflow; specs falham se houver |
| Lint | **indisponível no repo** (ESLint 9 sem flat config — já quebra na main; pré-existente) |

Limitações conhecidas da V2 (v1):
- Impressão do cupom V2 não traz o breakdown de couvert (item simples com notas).
- Ações em lote e resumo diário de impressão da fila ficam na V1 (GrillQueue).
- Notificações operacionais (sino) e paleta Ctrl+K ainda não têm par V2.
- Renovação de plano abre o paymentLink em nova aba (mesmo fluxo da V1).

## Rollback
- Reverter = `git revert 56efd418 3d438c38` na main + push (deploy automático),
  ou re-deploy do sha anterior via `deploy-release.sh <sha-anterior> frontend`.
  A V1 nunca saiu do ar em momento algum; não há migration nem mudança de backend.
