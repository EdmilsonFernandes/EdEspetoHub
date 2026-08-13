# Condominium Permanent Commerce Plan

> **Conceito SEPARADO** do fluxo de feira/evento (ver [`CONDOMINIUM_HUB_PLAN.md`](./CONDOMINIUM_HUB_PLAN.md)).
> Este plano descreve o **comércio permanente diário** no condomínio e o **local de retirada do vendedor**.
> A feira é intocada por este conceito.

## Contexto

O Hub já funciona como marketplace. O condomínio já existe como **modo hiperlocal opcional** com dois sabores:

1. **Feira/evento** (`CondominiumEvent` + `CondominiumEventStore`) — janela de tempo, "retirar na barraca".
2. **Permanente** (`StoreCondominium.active`) — a loja atende o condomínio **todo dia**, sem precisar de feira viva.

O commit `4a7f22f1` entregou o **filtro "Meu Condomínio"** no hub + o vínculo do cliente (condomínio/bloco/apto em `customer_addresses`). Pedidos do fluxo permanente passam pelo **checkout normal** (delivery/pickup) para o endereço-condo salvo — **não** pelo path de feira (`CartViewCondominium`/`resolveCondominiumOrderContext`), que segue 100% intocado.

## A distinção que rege tudo

| Conceito | Onde mora | Significa |
|---|---|---|
| **Morar no condomínio** | `customer_addresses.condominium_id` (atributo do **cliente**) | Onde o cliente recebe/retira |
| **Atender todo dia** | `store_condominiums.active` (vínculo loja↔condo) | A loja aparece no filtro "Meu Condomínio" |
| **Estar numa feira** | `condominium_event_stores` (vínculo loja↔evento) | A loja aparece na seção da feira viva |

Uma loja pode ter os três. Tudo desacoplado.

## O GAP que este plano resolve

**Local de retirada do vendedor não existe.**

Hoje `store_condominiums` tem `pickup_instructions` (texto livre), `allow_pickup_at_stall`, `allow_apartment_delivery`, `apartment_delivery_fee` — mas **nenhum bloco/apto estruturado do vendedor**. E o `StoreCondominiumPanel` (painel do lojista) nem expõe esses campos: é voltado só pra "entrar nas próximas feiras".

Consequência:
- **Entrega** → o pedido já leva o bloco/apto do **cliente** (endereço-condo salvo). ✅ Funciona.
- **Retirada** → o cliente **não sabe onde buscar**: falta o bloco/apto do **vendedor** dentro do condomínio. ❌ Gap.

## Modelo de dados proposto

### `store_condominiums` (aditivo, nullable)

```sql
ALTER TABLE store_condominiums
  ADD COLUMN IF NOT EXISTS pickup_block TEXT,
  ADD COLUMN IF NOT EXISTS pickup_unit TEXT;
```

- `pickup_block` — bloco/torre do **vendedor** (local de retirada).
- `pickup_unit` — apto/unidade do **vendedor**.
- Ambos **nullable** — vínculos existentes (incluindo os de feira) seguem idênticos.
- `pickup_instructions` (texto livre) **continua existindo** para notas livres ("falar com o porteiro", "retirar na portaria").
- Migration versionada: `20260813_001_store_condominium_pickup_location.ts` (registrada em `index.ts`, `schema.sql` atualizado).

### Por que em `store_condominiums` (e não em `stores`)

A localização de retirada é **por condomínio**: um vendedor pode morar no condomínio A (oferece retirada lá) e só atender o B (sem retirada, só entrega). O vínculo `store_condominiums` já é a granularidade certa.

## Fluxos

```
MEU CONDOMÍNIO (permanente)
  Filtro no hub → lojas com store_condominiums.active pro condomínio do cliente

  ENTREGA (apartment_delivery / delivery normal):
    Pedido normal → endereço-condo do CLIENTE (condominium_block/unit de customer_addresses)
    "Entregar em: Residencial Jardim · Bloco B · Apto 84"

  RETIRADA (pickup_at_stall / pickup normal):
    Pedido normal COM local de retirada = apto do VENDEDOR (pickup_block/unit de store_condominiums)
    "Retirada: Bloco C · Apto 12"
```

**Regra de exibição do pickup:** quando o pedido vem do filtro "Meu Condomínio" e é pickup, o local de retirada mostrado é o **apto do vendedor** (se preenchido); senão cai no `pickup_instructions` ou no nome do condomínio. O checkout **normal não é reescrito** — só recebe o ponto de retirada correto quando há contexto condomínio permanente.

## Governança

- **Cliente** nunca cria condomínio: seleciona da lista oficial (FK `condominium_id`). Sem condomínio na lista → CTA "Solicitar condomínio" → fluxo de `CondominiumAccessRequest` já existente → admin aprova → cria.
- **Loja** não se auto-declara "atendo Azuli": faz `StoreCondominiumRequest` → organizador/admin aprova → vira `StoreCondominium.active`.
- **Local de retirada do vendedor:** a própria loja preenche (`pickup_block`/`pickup_unit`) **depois de aprovada** no condomínio — é a casa dela. Sem aprovação extra necessária (é dado operacional, não de cobertura).

## UX

### Painel do lojista (`StoreCondominiumPanel`)
Hoje só pede pra entrar em feiras. Adicionar: quando **aprovada** num condomínio, mostrar campos **"Bloco"** e **"Apto/Unidade"** (local de retirada). Manter o tom existente; adicionar contexto permanente sem quebrar o de feira.

### Hub (`MarketplacePage`, filtro `my_condo`)
Sem mudança estrutural. O `HubStoreCard` pode ganhar um selo "Retira no condomínio" quando `pickup_block` preenchido (informativo).

### Checkout / confirmação / fila admin / tracking
- **Pickup permanente:** "Retirada: Bloco C · Apto 12" (vendedor).
- **Delivery permanente:** "Entregar em: Bloco B · Apto 84" (cliente) — já existe.
- Fila admin mostra o local de retirada pra o lojista/operador saber onde entregar/confirmar.

## Identidade visual

Mantém os tokens em produção (`#2f9df7` azul / `#5fd35a` verde / laranja CTA), raios e pesos existentes. Componentes novos seguem o `design-system-guardian` — nenhum novo sistema de cor/tipo. Reusa `HubStoreCard`, badges e inputs do design system atual.

## Riscos

1. **Quebrar a feira** — mitigado: path de feira (`CartViewCondominium`, `resolveCondominiumOrderContext`) **intocado**; colunas nullable; novo endpoint `permanent` separado.
2. **Confusão "retirada na barraca" vs "retirada no apto do vendedor"** — no permanente, "retirada" = apto do vendedor; na feira, = barraca. São fluxos diferentes; o card/checkout deve deixar claro qual.
3. **Loja sem `pickup_block` preenchido** — pickup mostra fallback (`pickup_instructions` ou nome do condomínio), nunca quebra.
4. **Validação de Postgres local indisponível** (porta 5432 é PgBouncer do Wibx) — `yarn test`/`migrate:status` não rodam local; validar via `compose-dev-backend.sh` antes do deploy.

## Divergência vs estudo anterior

O estudo detalhado da sessão `1685e9a3` propôs destravar o pedido permanente **modificando `resolveCondominiumOrderContext`** (fallback sem evento vivo) + listagem aditiva em `listPublicStoresBySlug`. **Isso NÃO foi implementado** e **não será** por este plano: a abordagem adotada é mais simples e segura — feira intocada, endpoint `permanent` separado, checkout normal reutilizado, condomínio como endereço salvo. Se no futuro for preciso um "pedido permanente com `condominium_fulfillment` (retirada/entrega sem feira como tipo distinto)", aí o fallback do estudo entra em jogo — fora de escopo agora.

## Escopo de implementação (aditivo)

1. ✅ Migration `pickup_block`/`pickup_unit` em `store_condominiums` (`20260813_001`, registrada; `schema.sql` atualizado).
2. ✅ `StoreCondominium` entity += campos; `listPermanentStores` retorna `pickupBlock`/`pickupUnit`/`pickupInstructions`; `listStoreCondominiumOptions` também (prefill do painel).
3. ✅ Endpoint `PATCH /stores/:storeId/condominiums/:condominiumId/pickup-location` (loja aprovada define seu local; repo `updateStorePickupLocation` separado p/ não regredir updates de admin/organizador) + proxy BFF.
4. ✅ `StoreCondominiumPanel`: "Local de retirada no condomínio" (Bloco + Apto) para vínculos aprovados.
5. ✅ Cliente vê o local: badge "Retirada: Bloco B · Apto 84" no card do hub (filtro `my_condo`) + no checkout (caixa e resumo de pickup) via navigation state (`myCondoPickup`), no mesmo padrão do `hubCoverageWarning`.
6. ✅ Fix crítico: `useHubLocation` não propagava `condominiumId` do endereço preferido → filtro `my_condo` era inoperante (bug latente do `4a7f22f1`).
7. ⏳ Validação local: frontend `test:unit` 199/199 + `build` ✅; backend `tsc` + BFF `build` ✅; **pendente** `yarn test`/`migrate:status`/`docs:schema` (Postgres local indisponível — rodar via `compose-dev-backend.sh` antes do deploy).
8. ⏳ Follow-ups: exibir local de retirada na fila admin/tracking do pedido; regenerar `database-schema.html`.

## Não goals

- Não criar tipo de pedido novo.
- Não mexer no checkout normal, na feira, em `order.type`, em auth ou em delivery.
- Não integrar retirada/entrega permanente com motoboy.
- Não criar migration para o schema legado de condomínio (fora de escopo; só a coluna nova é versionada).
