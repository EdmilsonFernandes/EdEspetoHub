# Entrega postal e rastreio

Este fluxo cobre pedidos com `type = delivery` e `fulfillment_mode = postal`.

## Como funciona

1. O cliente escolhe envio postal no checkout da vitrine.
2. O backend cria `order_shipments` com o serviço escolhido e status `pending_posting`.
3. A loja prepara o pedido normalmente na fila.
4. Ao postar, o vendedor informa o código em `PATCH /api/orders/:orderId/postal`.
5. O backend normaliza/valida o código, salva em `order_shipments`, marca o pedido como `dispatched` quando solicitado e grava eventos em `order_shipment_events`.
6. O cliente acompanha o pedido em `/pedido/:id`, com card postal, código, previsão e timeline.

## Tabelas

- `order_shipments`: dados principais do envio, código, URL, status, postagem e entrega.
- `order_shipment_events`: eventos da timeline postal.

Origem dos eventos:

- `system`: evento automático interno.
- `seller`: evento criado por ação do vendedor/operador.
- `carrier`: evento vindo de integração externa de rastreio.

## Provider de rastreio

O rastreio externo fica atrás de `ShippingTrackingProvider`.

Configuração atual:

```env
SHIPPING_TRACKING_PROVIDER=manual
```

Com `manual`, o sistema não depende de scraper nem de API instável. Ele entrega timeline interna, código de rastreio e link oficial dos Correios.

Provider Site Rastreio/Wonca:

```env
SHIPPING_TRACKING_PROVIDER=siterastreio
SITE_RASTREIO_API_KEY=
SITE_RASTREIO_BASE_URL=https://api-labs.wonca.com.br/wonca.labs.v1.LabsService
SITE_RASTREIO_TIMEOUT_MS=8000
SHIPPING_TRACKING_REFRESH_STALE_MINUTES=180
```

Observações:

- Também é aceito `WONCA_API_KEY` como alias da chave.
- O backend envia `POST /Track` com header `Authorization: Apikey <chave>`.
- O backend não consulta o provedor a cada polling da tela. Ele grava `checkedAt` em `order_shipments.tracking_last_event` e respeita `SHIPPING_TRACKING_REFRESH_STALE_MINUTES` para evitar gasto excessivo de créditos.
- Se a API retornar erro, timeout ou saldo insuficiente, o fluxo não quebra: a timeline interna continua aparecendo e o retorno inclui `trackingUnavailableReason`.
- Em teste real com a chave do projeto, o provedor respondeu `insufficient credit balance`; isso indica credencial reconhecida sem crédito disponível no provedor.
- Quando o provedor retorna mensagem como `Período inválido` ou sem eventos, a tela do cliente mostra uma mensagem amigável e mantém o link oficial dos Correios apenas como fallback.

Para plugar outro provedor externo no futuro:

1. Criar uma classe que implemente `ShippingTrackingProvider`.
2. Mapear eventos externos para os status internos (`posted`, `in_transit`, `out_for_delivery`, `delivered`, `exception`).
3. Registrar o provider em `ShippingTrackingService.resolveProvider`.
4. Configurar via env/feature flag.

## Status principais

- `pending_posting`: aguardando postagem.
- `posted`: pedido postado.
- `in_transit`: em trânsito.
- `out_for_delivery`: saiu para entrega.
- `awaiting_pickup`: aguardando retirada.
- `delivery_attempt`: tentativa de entrega.
- `delivered`: entregue.
- `exception`: ocorrência ou atenção no envio.

## Validações

- Código dos Correios clássico: `AA123456789BR`.
- Códigos genéricos também são aceitos quando têm formato alfanumérico válido.
- Código inválido retorna erro antes de salvar.

## Testes

Backend:

```bash
cd backend
yarn test
```

Frontend:

```bash
npm --prefix frontend run test:unit
npm --prefix frontend run test:e2e -- postal-order-tracking.spec.ts --project "Mobile Chrome"
```
