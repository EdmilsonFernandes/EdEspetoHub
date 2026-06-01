# Monetização de destinos, chalés e serviços

Este guia descreve como monetizar a área de destinos sem mudar o fluxo público atual.

## O que já está preparado

- `travel_destinations.sort_order`: ordena cidades/destinos na Home e nas telas públicas.
- `hospitality_places.sort_order`: ordena chalés/pousadas dentro do destino.
- `destination_listings.featured`: permite destacar serviços/restaurantes antes dos demais.
- `destination_listings.sort_order`: ordenação geral de serviços.
- `destination_listing_hospitality_places.sort_order`: ordenação específica de um serviço dentro de um chalé/pousada.
- Portal do parceiro em `/parceiro`: reduz trabalho manual do Super Admin, pois o parceiro atualiza dados operacionais sozinho.

## Pacotes comerciais sugeridos

### 1. Cadastro gratuito

Objetivo: aumentar base.

- Parceiro aparece na cidade correta.
- Pode editar dados básicos pelo portal.
- Sem prioridade comercial.
- Super Admin mantém aprovação e vínculos.

### 2. Destaque no chalé

Objetivo: vender posição para restaurantes/serviços que atendem uma hospedagem.

- Usar `destination_listing_hospitality_places.sort_order` baixo, por exemplo `0`, `1`, `2`.
- Manter outros parceiros com ordem maior, por exemplo `50`, `100`.
- Ideal para vender por chalé/pousada.

### 3. Destaque na cidade

Objetivo: vender exposição geral no destino.

- Usar `destination_listings.featured = true`.
- Ajustar `destination_listings.sort_order`.
- Ideal para serviços turísticos, restaurantes premium e experiências.

### 4. Hospedagem patrocinada

Objetivo: monetizar chalés/pousadas.

- Usar `hospitality_places.sort_order` baixo.
- Aplicar apenas após validação comercial.
- Recomendado criar campanhas mensais.

### 5. Cidade/destino patrocinado

Objetivo: monetizar prefeitura, associação comercial ou parceiro regional.

- Usar `travel_destinations.sort_order` baixo.
- Pode combinar com banner de destino e convite de parceiros.

## Regra operacional

Não dar acesso ao parceiro para alterar:

- ativo/inativo;
- prioridade;
- destaque;
- categoria;
- destino;
- vínculos com chalés/pousadas.

Esses campos são monetização e curadoria, portanto ficam no Super Admin.

## Sugestão de preço inicial

Enquanto a base ainda está crescendo, evitar preço alto.

- Cadastro gratuito: R$ 0.
- Destaque em um chalé: R$ 29 a R$ 49/mês.
- Destaque em cidade: R$ 79 a R$ 149/mês.
- Hospedagem patrocinada: R$ 99 a R$ 199/mês.

Quando houver tráfego real, revisar preço com base em:

- quantidade de cliques no WhatsApp;
- pedidos/contatos gerados;
- visualizações do chalé;
- quantidade de parceiros concorrendo pelo mesmo destino.

## Próximo passo técnico recomendado

Quando começar a vender destaque de forma recorrente, criar tabela própria de campanhas:

- `destination_promotions`
- `resource_type`
- `resource_id`
- `scope_type` (`DESTINATION`, `HOSPITALITY_PLACE`, `GLOBAL`)
- `scope_id`
- `starts_at`
- `ends_at`
- `price`
- `status`
- `payment_id`

Por enquanto, `sort_order` e `featured` são suficientes para preparar a operação sem criar complexidade desnecessária.
