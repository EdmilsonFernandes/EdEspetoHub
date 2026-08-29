# Rastreabilidade — cobranca-balcao

> G5 (em construção) · Matriz REQ → evidência · Atualizado: 2026-08-28

## Commits

| Commit | Escopo | Tarefas |
|---|---|---|
| 49a54b68 | Endpoint listagem de terminais (pré-SDD, registro simplificado) | — |
| f97fd324 | constitution.md + requirements.md (Fase 0 + G1) | — |
| 167acdfe | design.md + test_plan.md + tasks.md (G2+G3) | — |
| 4bf88cd7 | Backend: migration + services + rotas + webhook + testes | T1–T5 |
| (a seguir) | Frontend: ChargeSheet + botão Cobrar na fila | T6 |

## Matriz REQ → evidência

| REQ | Evidência | Status |
|---|---|---|
| REQ-1 | Rota POST charge c/ requireRole(ADMIN,LOJISTA,OPERATOR) (`routes/index.ts`) + sheet com 3 métodos (`ChargeSheet.tsx`) | ✅ código |
| REQ-2 | `BalcaoChargeService.createCharge` pix → `mercadoPago.createPayment` expiresInMinutes=5, token da loja; QR retornado | ✅ código |
| REQ-3 | Reuso do caminho existente `markPaidFromWebhook` (regressão coberta pela suite 100% verde) | ✅ código |
| REQ-4 | `getStatus.capabilities` (pix/point false + reason quando sem token); sheet desabilita com dica | ✅ código |
| REQ-5 | `expiresAt = +5min` (pix e point); MP `PT5M`; renovação encerra anterior | ✅ código |
| REQ-6 | `createPointCharge` — teste `MercadoPagoPointService.charge.test.ts` (body type=point/terminal/PT5M/valor) | ✅ teste |
| REQ-7 | Backend: 0 → PAY-020, 1 → direto, >1 → PAY-020 com terminals; Frontend: seletor no sheet | ✅ código |
| REQ-8 | `handleProviderWebhookOrder` + branch tópico order no PaymentController | ✅ código (smoke com hardware pendente) |
| REQ-9/10 | 404 → dica PDV; 403 → dica reconexão — testes charge.test.ts | ✅ teste |
| REQ-11 | PT5M + reconcile on open (`getStatus`) + polling UI 4s | ✅ código |
| REQ-12/13 | cash → `markPaidFromWebhook` + metadata.cashReceivedBy + PaymentAuditLog | ✅ código |
| REQ-14 | `suggestedAmount` = total do pedido; sheet abre preenchido | ✅ código |
| REQ-15 | `metadata.originalAmount/adjustedBy/adjustedAt/delta` + audit record | ✅ código |
| REQ-16 | `normalizeChargeAmount` — teste `BalcaoChargeService.test.ts` | ✅ teste |
| REQ-17 | Backend 409 PAY-021 (pedido pago); botão Cobrar some quando PAID | ✅ código |
| REQ-18 | `cancelCharge` + `cancelPointCharge` — teste idempotency/cancel | ✅ teste |
| REQ-19 | requireRole na rota (AUTH-003 store match no serviço) | ✅ código |
| REQ-20 | `uq_order_payments_order` (1:1) + guard cobrança ativa → PAY-021 | ✅ código |
| REQ-21 | `getStatus` reconcile com MP antes de responder + polling sheet | ✅ código |
| REQ-22 | Pendente: hook no cancelamento do pedido (T5 parcial — cancel manual coberto; cancel de pedido → cobrança no fluxo do OrderService a conectar) | ⏳ |
| REQ-23 | fetch fail → PAY-018 — teste network down; idempotency-key estável — teste | ✅ teste |
| REQ-24/25 | Sheet vive só na fila; rastreio do cliente intocado (nenhum import/props mudados em OrderTracking) — regressão: suite verde + QA visual | ✅ código / QA visual pendente |
| REQ-26 | description `Pedido {id8} - {loja}` (padrão já sem PII) | ✅ código |
| REQ-27 | HMAC x-signature existente cobre tópico order (mesma validação) | ✅ código |

## Validações executadas (saída real)

- Backend: `npm run build` (tsc) limpo · `yarn test` = **65 arquivos/339 testes unit + 17/100 integração — 100% verdes** (14 novos)
- Frontend: `npm run test:unit` + `npm run build` — (registrando após conclusão)

## Pendências (bloqueiam aceite formal G5)

1. **QA visual premium** web+mobile do sheet (playwright) + regressão do rastreio — T7
2. **Validação Docker local** da migration 20260828_002 (regra: migration = validar no Docker)
3. **Tópico `order` no webhook do app MP** (painel — dependência externa)
4. **REQ-22**: cancelamento do pedido encerra cobrança pendente (conectar ao fluxo existente de cancel)
5. **Smoke com Point Pro 3** (quando o hardware chegar): listar → cobrar real → webhook → PAID na fila

**Status G5: EM CONSTRUÇÃO — não aceito.**
