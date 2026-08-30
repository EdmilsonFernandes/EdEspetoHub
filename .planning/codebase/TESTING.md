# TESTING

| Alvo | Comando | Gate |
|---|---|---|
| Backend | `cd backend && yarn test` | 100% verde antes de commit |
| Backend (tipos) | `cd backend && npm run build` | verde (vitest não typechecka!) |
| Frontend | `cd frontend && npm run test:unit && npm run build` | build COMPLETO, não só tsc |
| Migration | `npm run migrate:status` | 0 pending + suite |
| Mobile | `npm --prefix frontend run build && npm --prefix mobile run android:sync` | — |

Armadilhas conhecidas:
- `MenuView` tem `@ts-nocheck` → erros de escopo só aparecem no BUILD (já
  quebrou prod; sempre `npm run build`, nunca só tsc).
- Vitest flaka sob carga (worker timeout) — rodar de novo antes de concluir
  que quebrou; suite de navegação: `src/navigation/adminNavigation.test.ts`
  (19 testes, guardiã da paridade operador/lojista).
- E2E: NUNCA contra banco de produção. Playwright em prod = read-only com
  login `gustavo-espetos`/`gustavo123` VIA `app.` (domínio raiz dá AUTH-004;
  headless novo pode bloquear → usar adminSession colado via storageState).
