# PROJECT CONTEXT - EdEspetoHub

Atualizado em: 2026-03-04

## Objetivo do produto
Plataforma de pedidos "like app" para restaurantes (estilo iFood), com:
- Cardapio web/mobile
- Checkout e acompanhamento de pedido
- Painel admin (pedidos, produtos, fila de producao, configuracoes, pagamentos)
- Fluxo de motoboy/entregador

## Stack (visao geral)
- Frontend: React + Vite + TypeScript
- Backend: Node/Nest-like APIs (estrutura em `backend/`)
- Infra: Docker + Nginx + EC2

## Principais mudancas recentes (ja em `main`)
0. Ajuste de tracking por tipo de pedido
- `OrderTracking`: "previsão de entrega/chegada" agora só aparece para `delivery`.
- Para `pickup/table`: copy ajustada para "previsão de preparo" / "pronto por volta de".

1. Mobile/admin UX fixes
- Modal de produto no admin com botoes salvar/cancelar visiveis no mobile.
- Ajustes de telas de entregadores/vinculos para layout like-app.

2. Checkout telefone (DDD)
- Combo de DDD Brasil adicionado.
- Depois removido default forcado `12`.
- Correcao de colar numero completo para aplicar DDD na primeira tentativa.

3. Adicionais de produto (core feature)
- Produto agora suporta adicionais pagos (modifiers) com quantidade.
- Preco final = preco base + adicionais selecionados.
- Refletido em carrinho, pedido, admin, fila, tracking, motoboy.
- Validacao e normalizacao no backend/frontend.

4. Exibicao de adicionais
- Cardapio/modal: selecao por `+/-`.
- Lista de pedidos/admin/fila/tracking: adicionais visiveis.
- Carrinho: resumo de adicionais no valor.

5. Pedidos recentes (cliente)
- Mantem ultimos 3 pedidos no storage.
- TTL de 24h.
- Mostra apenas pedidos que realmente existem no backend.

6. Melhorias visuais (like app)
- Cardapio com hierarquia visual mais forte.
- Modal de item com CTA sticky e controles mais intuitivos.
- Timeline de acompanhamento de pedido mais visual.
- Lista de pedidos (admin/dashboard) com bloco claro: Itens | Frete | Total.

7. Estabilidade runtime
- Correcoes no `AdminDashboard` (listeners/guard redundante).
- Remocao de wrappers/guards duplicados causando possivel travamento.
- Normalizacao de endereco para evitar crash React quando endereco vem como objeto.

8. Premium UI rollout (marco de 2026-03-04)
- Landing: secao de prova social ("lojas em destaque").
- Catalogo: barra de categorias sticky + bottom-sheet, busca premium, cards refinados.
- Checkout: limpeza visual mobile e CTA fixo premium, menos ruido.
- Onboarding/Criar loja: coluna unica, stepper mobile sem overflow, inputs/planos refinados.
- Branding: "Desenvolvido por" e logo oficial Ja no Caminho em pontos principais.

## Commits de referencia (mais recentes)
- `c91f6e7` fix(order-tracking): hide delivery forecast wording for pickup/table
- `ae56073` style(onboarding): replace broken mobile stepper with connected minimalist progress line
- `dea8331` style(onboarding): switch create-store to single-column clean layout and remove preview panel
- `d5d2abc` style(onboarding): premiumize create-store inputs, sticky nav bar and plan selection visuals
- `39a0f9e` style(branding): add Ja no Caminho logo to powered-by links and create-store header
- `2261502` fix(menu): use branding accentColor for dynamic add button theme
- `c0fb56a` feat(menu): make add button color inherit store secondary color with fallback
- `2edb6b5` fix(checkout): remove default DDD and handle full phone paste reliably
- `22d6053` feat(ui): refresh menu, modal, tracking and order money breakdown
- `73135ea` fix(admin): remove duplicate dashboard wrappers and guard loop
- `fef1f98` fix(runtime): normalize address objects to prevent react crash
- `13d20b1` fix(admin): stabilize dashboard listeners and guard effect

## Problemas operacionais mapeados
1. Erro 413 ao criar loja (upload grande)
- Causa: Nginx bloqueando tamanho do request.
- Acao feita: orientar configuracao `client_max_body_size 20M;`.

2. EC2 com disco cheio
- Limpezas Docker e sistema discutidas/aplicadas (`prune`, cache, `df`, `du`).

## Pontos que merecem proxima rodada
1. Performance Firefox/mobile
- Avaliar code-splitting das telas admin grandes.
- Reduzir render de listas com memoizacao/virtualizacao.

2. Nginx/proxy
- Confirmar em todos os proxies ativos o mesmo limite de body (caso haja Nginx em container + host).

3. Testes de regressao
- Fluxo completo: criar loja -> cadastrar produto com adicionais -> pedido -> fila -> tracking -> entrega.

## Como retomar rapidamente em nova sessao Codex
1. Abrir repo `EdEspetoHub`.
2. Pedir: "leia PROJECT_CONTEXT.md e os ultimos commits".
3. Informar bug atual e tela exata + passos de reproducao.

## Arquivos mais sensiveis tocados recentemente
- `frontend/src/components/Client/CartView.tsx`
- `frontend/src/components/Client/MenuView.tsx`
- `frontend/src/components/Cart/ProductModal.tsx`
- `frontend/src/pages/AdminDashboard.tsx`
- `frontend/src/pages/AdminOrders.tsx`
- `frontend/src/pages/OrderTracking.tsx`
- `frontend/src/pages/MotoboyCurrent.tsx`
- `frontend/src/components/Admin/GrillQueue.tsx`
- `frontend/src/components/Motoboy/OrderCard.tsx`
- `frontend/src/utils/format.ts`
- `frontend/src/App.tsx`

