# Plano de testes — cobranca-balcao

> Gate G2 · Aprovação: fluxo contínuo autorizado (PO 2026-08-28), sujeito a revisão.
> Comandos reais: backend `cd backend && yarn test` (unit: `vitest.config.unit.ts`) ·
> frontend `cd frontend && npm run test:unit && npm run build`.

## Níveis

1. **Unit backend** (vitest unit): serviços com `fetch` do MP mockado (padrão do repo).
2. **Integração backend** (vitest config principal, banco de teste): rotas + webhook.
3. **Unit frontend**: estados do sheet (componente puro).
4. **QA visual (playwright-visual-qa)**: fila web (1280px) + mobile (390px) — sheet
   fechado/aberto/aguardando/pago/expirado; **regressão do rastreio do cliente**.
5. **Smoke real (hardware)**: com a Point Pro 3 — listagem + cobrança real + webhook,
   registrado em `rastreabilidade.md` (G5). **E2E nunca contra produção.**

## Mapa REQ → caso de teste

| REQ | Caso | Nível / comando |
|---|---|---|
| REQ-1 | charge abre com 3 métodos; role sem permissão → 403 (PAY/ AUTH-003) | int.: `BalcãoCharge.routes.integration.test.ts` |
| REQ-2 | createPix gera cobrança com token da loja + 5min + QR no retorno | unit: `BalcãoChargeService.test.ts` |
| REQ-3 | webhook payment → PAID (caminho existente não regrediu) | int.: webhook payment fixture |
| REQ-4 | sem conta conectada → payload com `pixEnabled:false, pointEnabled:false, cashEnabled:true` + motivo | unit/int |
| REQ-5 | pix expirado (5min) → permite novo; anterior marcada EXPIRED | unit: clock fake |
| REQ-6 | createPoint monta body MP (`type=point`, `terminal_id`, `PT5M`, `external_reference=orderPaymentId`, idempotency-key) | unit: assert do fetch |
| REQ-7 | 1 terminal → usado direto; >1 → sheet pede escolha (UI) | unit listTerminals (já coberto) + visual |
| REQ-8 | webhook order → resolve por `provider_order_id` → PAID idempotente | int.: fixture order processed |
| REQ-9/10 | MP 404/403 → PAY-018 com dica de reconexão; sem PDV → mensagem | unit |
| REQ-11 | order point expirada → ENCERRADA + nova permitida | unit: clock fake |
| REQ-12/13 | dinheiro: marca PAID + grava PaymentAuditLog (autor, valor, hora) | unit + int |
| REQ-14 | payload inicial traz total em aberto sugerido | int (rota active/status) |
| REQ-15 | amount≠total → cobra ajustado + metadata.originalAmount + audit | unit |
| REQ-16 | amount ≤0/não numérico/>2 decimais → 400 PAY-016 | unit |
| REQ-17 | pedido PAID → POST charge 409 PAY-021; botão some (visual) | int + visual |
| REQ-18 | cancel encerra no MP + local CANCELED; já paga → 409 | unit |
| REQ-19 | usuário sem papel → 403 | int |
| REQ-20 | cobrança ativa existente → 409 (ou renova quando expirada) | unit |
| REQ-21 | abrir sheet chama refresh do status real (MP) antes de responder | unit: fetch chamado |
| REQ-22 | cancelar pedido com charge pendente → cancela no MP | int: fluxo cancel existente + spy |
| REQ-23 | MP fora (fetch reject) → 502 PAY-018; retry não duplica (idempotency fixa) | unit |
| REQ-24/25 | rastreio cliente: zero diff visual/props — suite existente + QA visual | frontend unit + visual |
| REQ-26 | description MP sem PII (só `Pedido #n — loja`) | unit: assert body |
| REQ-27 | webhook sem assinatura válida → 401/503, não marca pago | int |
| RNF-1 | latência confirmação ≤10s p95 — verificação manual de wede (log webhook→PAID) no smoke | smoke G5 |
| RNF-2/3/4 | sheet ≤1s, alvos 44px, WebView — QA visual + APK manual | visual |
| RNF-5 | offline no fetch → erro claro, estado preservado | unit + visual |
| RNF-6 | idempotência (D9 + webhook duplicado) | unit/int |
| RNF-7 | logs sem PII/token — revisão de diff (G4) + grep em testes | revisão |

**Comando de barreira antes de commit:** `cd backend && npm run build && yarn test` e
`cd frontend && npm run test:unit && npm run build` — 100% verde (regra da constituição).
