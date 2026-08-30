# ADR-002 — Pedido entra na fila somente após pagamento confirmado

2026 · aceito

## Context

Pedidos não pagos na fila de produção geravam retrabalho (cozinha inicia,
pagamento falha/cancela) e disputa de cancelamento silenciosa.

## Decision

Pedido online só entra na fila da loja depois de pago (Pix confirmado por
webhook, ou crédito/débito aprovado). Exceção: pedidos criados pelo lojista no
balcão (REQ-28, 28/08) não passam por checkout.

## Reason

- A fila é compromisso de produção; pagamento é o gatilho do compromisso.
- Elimina o estado "pedido fantasma" na cozinha.

## Consequences

- Webhook do Mercado Pago é componente crítico (Pix confirmado fora dele =
  pedido não existe ainda para a loja).
- Cancelamento com fila vazia nunca transita `awaiting_payment→cancelled`
  (causa raiz do bug de cancelamento da auditoria 17/08).
- Fluxo balcão (29/08): cobrança acontece DEPOIS, via sheet Cobrar no card.
