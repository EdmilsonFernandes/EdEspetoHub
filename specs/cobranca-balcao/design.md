# Design — cobranca-balcao

> Fase 2 do SDD Janocaminho · Gate G2 · Aprovação: Edmilson (Arquiteto)
> Spec de origem: `specs/cobranca-balcao/requirements.md` (aprovada em 2026-08-28)
> Status: **Aprovado por fluxo contínuo — PO autorizou avanço sem pausa (2026-08-28),
> sujeito a revisão posterior do Edmilson** · Autor: agente · Data: 2026-08-28

## 1. Visão arquitetural

O lojista (ADMIN/LOJISTA/OPERATOR) toca **"Cobrar"** no card da fila → sheet abre com o
valor em aberto (editável) e três formas: **Pix**, **Cartão (maquininha)** e **Dinheiro**.
Pix e Cartão criam cobrança no Mercado Pago **da conta conectada da loja** (mesmo token
OAuth já usado pelo checkout); a confirmação chega pelo webhook existente
(`/webhooks/mercadopago`, agora também assinando o tópico `order` do MP). Dinheiro é
registro manual auditável. O pedido transita `payment_status → PAID` pelo mesmo caminho
de hoje — fila e rastreio do cliente não mudam.

**Serviços afetados:** frontend (:8080) · BFF apis (:5000) · backend (:4000) · mobile
(Capacitor, via web) — face-worker não participa.

```mermaid
flowchart LR
  A[Fila AdminOrders<br/>botão Cobrar] --> B[BFF :5000<br/>authRequired + forward]
  B --> C[Backend :4000<br/>BalcãoChargeController]
  C --> D[BalcãoChargeService<br/>pix/point/dinheiro + ajuste]
  D --> E[(order_payments<br/>+ PaymentAuditLog)]
  D --> F[[MP Orders API<br/>type=point PT5M]]
  D --> G[[MP Pix<br/>token da loja]]
  F -.webhook order. --> H[/webhooks/mercadopago/]
  G -.webhook payment. --> H
  H --> D
  D --> I[Fila + rastreio<br/>payment_status=PAID]
```

## 2. Cobertura dos requisitos

| REQ | Serviço | Componente / mecanismo |
|---|---|---|
| REQ-1 | frontend+backend | Botão "Cobrar" no card (payment pending) + `POST .../charge` (requireRole ADMIN,LOJISTA,OPERATOR) |
| REQ-2 | backend | BalcãoChargeService.createPix → reusa pipeline Pix com token da loja; QR retornado ao sheet |
| REQ-3 | backend | `markPaidFromWebhook` existente (payment topic) |
| REQ-4 | backend+frontend | `getActiveAccessToken` nulo → opção desabilitada + motivo; Dinheiro segue |
| REQ-5 | backend | `expires_at = now+5min`; expirada → nova cobrança encerra a anterior (sem 2 ativas) |
| REQ-6 | backend | BalcãoChargeService.createPoint → MP order `type=point`, `expiration_time=PT5M` |
| REQ-7 | backend+frontend | listTerminals (já em prod) → 1 terminal direto, >1 seletor no sheet |
| REQ-8 | backend | webhook tópico `order` → resolve order_payment por `provider_order_id` → PAID |
| REQ-9/10 | backend+frontend | erros PAY-02x com dica (sem terminal / reconectar MP) no sheet |
| REQ-11 | backend | expiração PT5M + reconcile on open (refreshFromProvider estendido) |
| REQ-12/13 | backend | Dinheiro = OrderPayment provider MANUAL + PaymentAuditLog (quem, quanto, quando) |
| REQ-14 | frontend | sheet abre com total em aberto sugerido |
| REQ-15 | backend | ajuste grava `metadata.originalAmount/adjustedBy/adjustedAt`; PaymentAuditLog |
| REQ-16 | frontend+backend | validação valor > 0, 2 decimais (zod-like manual, sem dep nova) |
| REQ-17 | frontend+backend | botão some com payment_status=PAID; endpoint recusa pedido pago (PAY-021) |
| REQ-18 | backend | cancel: encerra cobrança MP (order cancel / payment cancel) + status local |
| REQ-19 | backend | requireRole('ADMIN','LOJISTA','OPERATOR') na rota de cobrança |
| REQ-20 | backend | índice único parcial: 1 cobrança ativa por (order, método ativo) — ver D6 |
| REQ-21 | backend | ao abrir sheet/consultar: refresh do status real no MP antes de responder |
| REQ-22 | backend | cancelamento do pedido chama cancelamento da cobrança pendente (hook no fluxo existente) |
| REQ-23 | backend+frontend | erro upstream vira mensagem clara; idempotency-key = order_payment id |
| REQ-24/25 | frontend | sheet só na fila; rastreio do cliente intocado (regressão QA visual) |
| REQ-26 | backend | description MP = `Pedido #<n> — <loja>` (sem nome/telefone do cliente) |
| REQ-27 | backend | HMAC x-signature já validado (PaymentController) — estende ao tópico order |
| RNF-1..7 | — | ver §6/§7 e test_plan |

## 3. Modelo de dados

**Tabela afetada: `order_payments`** (extensão — sem tabela nova):

| Campo novo | Tipo | Semântica |
|---|---|---|
| `provider_order_id` | varchar null | id da **order** MP (Point) — distinto de `provider_id` (id do pagamento) |
| `terminal_id` | varchar null | maquininha que recebeu a cobrança |
| `metadata` | jsonb null | `{ originalAmount, adjustedBy, adjustedAt, chargeSource: 'balcao'|'checkout', cashReceivedBy }` |

**Migration:** `backend/src/migrations/20260828_001_order_payment_point_charge.ts`
(aditiva, colunas nullable — **reversível** com DROP COLUMN) + registro em
`migrations/index.ts` + `schema.sql` + `database-schema.html`. Roda no boot (deploy
versão mista ok: colunas novas nullable, código antigo ignora).

**Dados sensíveis:** nada novo de PII. Tokens MP continuam cifrados em
`store_payment_accounts`. `metadata` guarda apenas ids/valores/autor do ajuste.

## 4. Contratos e interfaces

Frontend **sempre via BFF** (D10). Rotas novas (backend `routes/index.ts` + forward
`apis/src/domains/proxy/proxy.routes.ts`):

| Operação | Contrato | Sucesso | Erros |
|---|---|---|---|
| `POST /stores/:storeId/orders/:orderId/charge` | `{ method: 'pix'\|'point'\|'cash', amount?, terminalId? }` | `201 { charge: { orderPaymentId, method, amount, status, qrCodeText?, qrCodeBase64?, terminalId?, expiresAt } }` | 400 PAY-016 valor inválido · 403 AUTH-003/role · 409 PAY-021 já pago/ativa · 502 PAY-018/022 MP |
| `POST /stores/:storeId/orders/:orderId/charge/:chargeId/cancel` | `{}` | `200 { status:'CANCELED' }` | 409 se já paga · 502 MP fora |
| `GET /stores/:storeId/orders/:orderId/charge/active` | — | `200 { charge \| null }` (com reconcile REQ-21) | 502 MP fora |
| `GET .../payment-accounts/mercadopago/point/terminals` | já em prod (49a54b68) | 200 | PAY-017/018 |

**Webhook MP:** mesmo endpoint `/webhooks/mercadopago`; app MP assina `payment` (hoje) +
**`order` (novo — configurar no painel, dependência de deploy)**. Payload order → id →
`GET /v1/orders/{id}` (token da loja resolvido pelo order_payment) → status
`processed/confirmed` → marca PAID. Idempotente por `provider_order_id` + status final.

**Formato de erro:** AppError existente (code, message amigável) — sem detalhe interno.

## 5. Decisões técnicas e alternativas descartadas

| # | Decisão | Justificativa | Alternativa descartada |
|---|---|---|---|
| D1 | Point vive em `order_payments` | histórico de caixa num lugar só; fila/audit já leem daí | tabela `point_charges` separada — fragmenta conciliação |
| D2 | `provider_order_id` ≠ `provider_id` | webhook order resolve por order-id sem quebrar o payment-id existente | sobrescrever provider_id — quebraria webhook Pix |
| D3 | **crédito/débito/parcelas escolhe o cliente NA maquininha** (order sem `payment_method` fixo) | fluxo nativo que lojista/cliente já conhecem; 1 toque a menos; evita erro de seleção | pré-selecionar tipo no sheet — passo extra + retrabalho se cliente muda de ideia |
| D4 | Dinheiro = OrderPayment `provider=MANUAL` + audit log | fecha ciclo com rastro; substitui o `window.confirm` atual | manter só o confirm manual — sem valor/auditoria (status quo ruim) |
| D5 | Expiração 5 min nos dois métodos (REQ do PO) | balcão é presencial: 5 min basta; renovação = nova cobrança | 15/30 min — trava re-cobrança |
| D6 | 1 cobrança **ativa** por pedido | REQ-20; enforce no serviço + índice parcial onde 1=1 evita 2 QRs/mp ativos | permitir múltiplas ativas — conciliação ambígua |
| D7 | Sheet pré-seleciona o método escolhido pelo cliente no checkout (pix_loja→Pix etc.) | continuidade do que o cliente pediu; lojista troca se quiser | sempre neutro — toque a mais no caso comum |
| D8 | Entry point: botão **Cobrar** no footer do card (payment pending) | mesma área do confirm manual atual — muscle memory preservado | botão no detalhe só — escondido no ritmo de balcão |
| D9 | Idempotency-key MP = `order_payment_id` | retry de rede nunca duplica cobrança | uuid aleatório por tentativa — duplica |
| D10 | Sem dependência nova (zod etc.) | validação manual segue padrão do repo | lib nova — custo sem ganho |

**MVE (hardware pendente):** chamada real `POST /v1/orders` só é possível com terminal
físico; até a Pro 3 chegar, backend validado com fixtures do MP (testes) + endpoints
denunciam erro controlado em produção. Chegada do hardware = smoke test real registrado
no `rastreabilidade.md` (G5).

## 6. Segurança (concreta)

- **Autorização:** rota backend `requireAuth + requireRole('ADMIN','LOJISTA','OPERATOR')`
  + guarda `authStoreId === storeId` (mesmo padrão AUTH-003 do payment-accounts). BFF
  só repassa com `authRequired` (decisão final é do backend).
- **Valores:** total sempre recalculado do servidor (`order` + itens); `amount` do body
  só aceito como **ajuste auditado** (REQ-15), nunca substitui o total sem rastro.
  Cliente final nunca informa valor (cobrança é staff-only).
- **Webhook:** HMAC SHA-256 `x-signature` com `MP_WEBHOOK_SECRET` (implementado em
  `PaymentController`) cobre ambos os tópicos; sem secret configurado → log warn + 503
  (não processa às cegas).
- **Idempotência:** webhook por provider ids; charge por D9; reenvio não muda estado.
- **Minimização (REQ-26):** `description = "Pedido #<n> — <nome da loja>"`; external_reference
  = `order_payment_id` (uuid, sem PII).
- **Logs:** sempre com orderId/chargeId/storeId; **nunca** token MP, nome/telefone do
  cliente ou QR payload completo.
- **Segredos:** nada novo; tokens continuam cifrados (AES) em `store_payment_accounts`.

## 7. Testes, observabilidade, erros

- **Estratégia:** unit backend (services com fetch mockado — padrão vitest unit),
  integração (rotas + webhook com fixtures), frontend unit (sheet states), QA visual
  (fila web+mobile). Detalhe em `test_plan.md`.
- **Observabilidade:** logs estruturados por evento (charge_created/confirmed/expired/
  canceled/reconciled) + métricas futuras via PaymentEvent existente.
- **Erros:** PAY-016 (valor inválido), PAY-017 (sem conta), PAY-018 (MP/terminal recusa),
  PAY-021 (pedido pago/charge ativa), PAY-022 (cancel/estado inválido) — mensagens
  amigáveis no sheet, detalhe técnico só no log.

## 8. Impactos, migração e rollback

- **Compat:** colunas nullable + código antigo ignora → deploy misto seguro; rastreio do
  cliente e checkout intocados (REQ-24/25 por construção).
- **Rollback código:** revert do commit; colunas ficam (inócuas). **Rollback migration**
  (se exigido): DROP COLUMN ×3 — sem perda crítica (metadata regenerável pelos logs).
- **Dependência operacional (registrar):** habilitar tópico `order` no webhook do app MP
  "Ja no Caminho Tecnologias" antes do deploy (painel ou MCP) — sem isso, confirmação
  Point cai no reconcile-on-open (degrada, não quebra).
