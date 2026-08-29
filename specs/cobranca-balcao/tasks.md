# Tarefas — cobranca-balcao

> Gate G3 · Fluxo contínuo autorizado (PO 2026-08-28). Cada Tn = 1 commit revisável,
> validação verde antes (constituição §3). Rastreio: commit cita `— REQ-n, Tn`.

| Tn | Tarefa | REQs | Validação de barreira |
|---|---|---|---|
| T1 | Migration `20260828_001` (order_payments: provider_order_id, terminal_id, metadata) + entity + schema.sql + database-schema.html | 6,8,15 | `npm run build` + `yarn test` + migrate aplicada no Docker local |
| T2 | `MercadoPagoPointService`: createPointCharge / cancelPointCharge / getPointOrder (adapter MP, idempotency-key, description sem PII) | 6,18,21,23,26 | unit com fetch mockado |
| T3 | `BalcãoChargeService`: capabilities, create (pix/point/cash), ajuste auditado, expiração 5min, 1-ativa, cancel, reconcile | 1..5,9..23 | unit completo |
| T4 | Controller + rotas backend (requireRole ADMIN,LOJISTA,OPERATOR) + forward BFF | 1,19 | int de rotas |
| T5 | Webhook tópico order (resolução por provider_order_id, idempotente, assinatura) | 8,27 | int webhook fixtures |
| T6 | Frontend: orderService methods + `ChargeSheet` (estados) + botão Cobrar no card (substitui confirm manual) | 1,7,9,14,17,24 | `npm run test:unit && npm run build` |
| T7 | QA visual premium web (1280) + mobile (390) + regressão rastreio cliente | 24,25, RNF-2,3,4 | playwright-visual-qa, evidências em `.ux-audit/` |
| T8 | `rastreabilidade.md` (matriz REQ→evidência) + dependência webhook tópico order no painel MP + smoke Pro 3 (pendente hardware) | todos | G5 |

**Status:** T1–T8 a executar. Dependências externas: tópico `order` no app MP (painel);
Pro 3 (hardware) p/ smoke real.
