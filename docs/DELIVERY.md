# Delivery / Motoboy - Estado Atual e Pontas a Amarrar

Este documento descreve como o fluxo de entregas (motoboy) funciona hoje no EdEspetoHub e o que falta para atender "Gerenciamento Inteligente do Motoboy" (exclusividade, concorrencia, auditoria, metricas) sem reescrever o sistema.

## Backend: Entidades/Tabelas Existentes

- `orders` (`backend/src/entities/Order.ts`)
  - Campos relevantes: `id`, `type`, `status`, `address`, `deliveryFee`, `paymentStatus`, `createdAt`, `store_id`
  - Observacao: o status do pedido (`orders.status`) e usado pelo painel da loja e tracking publico.

- `store_settings` (`backend/src/entities/StoreSettings.ts`)
  - Campos relevantes: `delivery_radius_km`, `delivery_fee`
  - Observacao: o frete fixo e configurado por loja e o valor do frete do pedido e persistido em `orders.delivery_fee`.

- `motoboys`, `motoboy_stores`, `motoboy_store_requests`, `motoboy_documents`
  - Vínculo e aprovacao do entregador por loja.

- `order_deliveries` (`backend/src/entities/OrderDelivery.ts`)
  - Hoje: 1 linha por pedido (PK = `order_id`), com `motoboy_id`, `assigned_at`, `delivered_at`, e confirmacao de pagamento.
  - Observacao: antes desta melhoria, `order_deliveries` so existia depois que o motoboy aceitava; a "fila" era baseada apenas em `orders.status`.

## Backend: Rotas Existentes Relacionadas a Entrega

Arquivo: `backend/src/routes/index.ts`

- Fila / motoboy:
  - `GET /motoboy/orders/available` (lista pedidos `delivery` em status de fila)
  - `POST /motoboy/orders/:orderId/accept`
  - `POST /motoboy/orders/:orderId/delivered`
  - `POST /motoboy/orders/:orderId/confirm-payment`
  - `GET /motoboy/orders/history`
  - `GET /motoboy/orders/current`
  - `GET /motoboy/earnings/today`

- Loja / pedidos:
  - `PUT /orders/:orderId/status` (loja muda status do pedido via `OrderService.updateStatus`)

## Onde o Frete E Definido/Armazenado Hoje

- Definicao: `store_settings.delivery_fee` (frete fixo configurado pela loja).
- Persistencia no pedido: `orders.delivery_fee`.
- Calculo do total: `OrderService.buildOrder()` soma itens + `deliveryFee`.

## O Que Faltava (para os requisitos do "Gerenciamento Inteligente")

O sistema ja tinha:
- pedido em fila via `orders.status` (ex.: `ready_for_delivery`, `waiting_for_motoboy`);
- motoboy aceita e o pedido vira `in_delivery`;
- entrega finaliza em `delivered/finished`.

O que faltava "amarrar" de forma garantida no banco e via regras:
- Exclusividade: motoboy com apenas 1 entrega ativa por vez (garantia via indice/constraint + checagem transacional).
- Concorrencia: impedir 2 motoboys aceitarem o mesmo pedido sob corrida.
- Estados do delivery separados do status do pedido (para permitir transicoes: AVAILABLE -> ACCEPTED -> PICKED_UP -> IN_TRANSIT -> DELIVERED, sem quebrar telas existentes).
- Expiracao: delivery expirar se ninguem aceitar ate `expires_at`.
- Auditoria: registrar eventos em `delivery_events` para cada mudanca.
- Metric as do motoboy (periodo, media de tempo, canceladas, atual, ultima concluida).

## Direcao da Implementacao Incremental (sem reescrever)

1. Evoluir `order_deliveries` para virar a entidade "delivery":
   - permitir `motoboy_id` nulo quando `status = 'AVAILABLE'` (representa fila)
   - adicionar `status`, `freight_value`, `accepted_at`, `picked_up_at`, `delivered_at`, `canceled_at`, `canceled_reason`, `expires_at`
2. Criar `delivery_events` para auditoria.
3. Usar transacoes/locks + indice unico parcial para garantir:
   - 1 entrega ativa por motoboy
   - 1 motoboy por entrega
4. Manter `orders.status` para UI existente (loja e tracking), enquanto o workflow do motoboy usa `order_deliveries.status`.

