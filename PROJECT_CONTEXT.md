# PROJECT CONTEXT - EdEspetoHub

Atualizado em: 2026-03-17

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

## Status atual (ok para retomada)
- Build frontend validado em 2026-03-13 (`tsc --noEmit` e `vite build`).
- Fluxo Admin separado entre visao operacional e visao financeira/relatorios sem alterar regras de negocio.
- PWA habilitado com rota de instrucoes de instalacao para Android/iPhone.
- Ultimos pushes em `main` concluidos.

## Atualizacoes recentes (2026-03-16 a 2026-03-17)
1. Blindagem de interacao (checkout/config)
- Checkout protegido contra duplo clique:
  - trava de envio (`lock`) + estado `checkoutLoading`.
  - botao final muda para `Processando...` e desabilita durante requisicao.
- `Buscar CEP` protegido contra chamadas concorrentes com lock dedicado.
- Feedback de sucesso padronizado para 3s:
  - finalizar pedido.
  - salvar identidade/configuracoes da loja.
- Arquivos:
  - `frontend/src/pages/StorePage.tsx`
  - `frontend/src/components/Client/CartView.tsx`
  - `frontend/src/pages/AdminDashboard.tsx`

2. Configuracoes com Dirty State real
- Barra fixa no topo: `Alterações não salvas detectadas`.
- Save em destaque (visual pulsante) quando houver alteracoes pendentes.
- Guard de navegacao:
  - troca de aba/menu pede confirmacao para descartar.
  - refresh/fechamento de aba dispara `beforeunload` quando necessario.
- Modal: `Você tem alterações não salvas` com opcoes continuar/sair sem salvar.
- Arquivo:
  - `frontend/src/pages/AdminDashboard.tsx`

3. Correção de status logístico no monitor (fila)
- Ajuste sem alterar enum/back-end:
  - `waiting_for_motoboy` sem entregador atribuido => `Buscando entregador`.
  - `waiting_for_motoboy` com entregador atribuido => `Aguardando retirada`.
- Mensagem contextual do card:
  - sem motoboy: "Buscando entregador para retirada."
  - com motoboy: "Entregador <nome> está vindo buscar."
- Arquivo:
  - `frontend/src/components/Admin/GrillQueue.tsx`

## Atualizacoes recentes (2026-03-10 a 2026-03-13)
1. PWA e instalacao
- PWA consolidado (service worker + manifest + icones).
- Nova pagina `/instalar` com passo a passo Android (Chrome) e iPhone (Safari).
- Landing com CTAs para instalacao (menu, hero, footer).

2. Queue/operacao (Admin)
- Removida barra financeira da aba operacional de pedidos.
- Removido filtro redundante `Todos` da fila; filtros focados em status.
- Destaque de mesa reforcado (badge forte em laranja).
- "Prazo estourado" com pulso suave para alerta visual.

3. Financeiro/relatorios
- Aba `Finalizados hoje` evoluida para `Faturamento & Relatorios` (admin).
- Para operador, rotulo e foco em `Pedidos Finalizados` (sem poluicao financeira).
- Filtros de periodo:
  - Hoje
  - Ontem
  - Ultimos 7 dias
  - Calendario (intervalo customizado)
- Card de comparativo (% vs periodo anterior).
- Bloco "Dinheiro em caixa (periodo)" com Pix, Dinheiro e Cartao (admin).

4. Mobile footer
- Botao `Vendas` no rodape mobile abre a visao de relatorios via `/admin/queue` com `activeTab: completed`.
- Botao `Pedidos` permanece no monitor operacional.

5. Semantica de valores no detalhe do pedido
- Troca de "Itens: R$..." para "Volume: X itens".
- Linha final padronizada para "Total a pagar".
- Se frete for zero, exibicao simplificada (sem subtotal/frete desnecessario).

## Principais mudancas recentes (ja em `main`)
0. Admin UX premium (2026-03-05)
- Header admin evoluido para visual premium minimalista com identidade dinamica da loja.
- Bloco da loja com banner/cor principal, overlay para contraste e transicao fade para lado branco.
- Badge de plano virou trigger de popover com dados de assinatura e CTA de gerenciamento.
- Dropdown do avatar concentra acao de logout no desktop.
- Command Palette (Ctrl+K) limpa com remocao definitiva de "Resumo/Resumo executivo".
- Atalho textual no dashboard ajustado para "Monitor de pedidos".

1. Ajuste de tracking por tipo de pedido
- `OrderTracking`: "previsão de entrega/chegada" agora só aparece para `delivery`.
- Para `pickup/table`: copy ajustada para "previsão de preparo" / "pronto por volta de".

2. Mobile/admin UX fixes
- Modal de produto no admin com botoes salvar/cancelar visiveis no mobile.
- Ajustes de telas de entregadores/vinculos para layout like-app.

3. Checkout telefone (DDD)
- Combo de DDD Brasil adicionado.
- Depois removido default forcado `12`.
- Correcao de colar numero completo para aplicar DDD na primeira tentativa.

4. Adicionais de produto (core feature)
- Produto agora suporta adicionais pagos (modifiers) com quantidade.
- Preco final = preco base + adicionais selecionados.
- Refletido em carrinho, pedido, admin, fila, tracking, motoboy.
- Validacao e normalizacao no backend/frontend.

5. Exibicao de adicionais
- Cardapio/modal: selecao por `+/-`.
- Lista de pedidos/admin/fila/tracking: adicionais visiveis.
- Carrinho: resumo de adicionais no valor.

6. Pedidos recentes (cliente)
- Mantem ultimos 3 pedidos no storage.
- TTL de 24h.
- Mostra apenas pedidos que realmente existem no backend.

7. Melhorias visuais (like app)
- Cardapio com hierarquia visual mais forte.
- Modal de item com CTA sticky e controles mais intuitivos.
- Timeline de acompanhamento de pedido mais visual.
- Lista de pedidos (admin/dashboard) com bloco claro: Itens | Frete | Total.

8. Estabilidade runtime
- Correcoes no `AdminDashboard` (listeners/guard redundante).
- Remocao de wrappers/guards duplicados causando possivel travamento.
- Normalizacao de endereco para evitar crash React quando endereco vem como objeto.

9. Premium UI rollout (marco de 2026-03-04)
- Landing: secao de prova social ("lojas em destaque").
- Catalogo: barra de categorias sticky + bottom-sheet, busca premium, cards refinados.
- Checkout: limpeza visual mobile e CTA fixo premium, menos ruido.
- Onboarding/Criar loja: coluna unica, stepper mobile sem overflow, inputs/planos refinados.
- Branding: "Desenvolvido por" e logo oficial Ja no Caminho em pontos principais.

## Commits de referencia (mais recentes)
- `ec2e923` fix(queue): show awaiting pickup only after motoboy assignment
- `997419b` feat(ui): prevent duplicate checkout and guard unsaved settings
- `ffa7d3f` refactor(queue): split financial reports from operational finalized view
- `db6367e` refactor(queue): split operational view from revenue reports and streamline filters
- `d06040f` refactor(queue): sticky performance bar, yesterday comparison, and cleaner order totals
- `c6484de` feat(landing): add dedicated install page and CTA links for Android/iPhone
- `227307b` feat(landing): add explicit install app CTA with beforeinstallprompt handling
- `ce6a9bf` feat(pwa): enable vite pwa plugin with service worker and app icons
- `f3db56b` feat(product-images): compress/resize uploads before base64 persist
- `d994f75` feat(product-images): replace URL input with camera/file upload and instant preview
- `fa6198d` fix(menu): restore options indicator for skewer products in staff mode
- `5d58bca` fix(menu): keep plus quick-add for staff and open modal only from options badge
- `c181c39` fix(menu): restore product options modal flow after catalog refactor
- `9db20bb` fix(guard): bypass BILL-001 debt blocking for public storefront checkout
- `5c58403` fix(guard): apply unpaid-delivery block only for delivery orders
- `fa5077e` fix(phone-mask): apply mobile phone mask on store phone settings field
- `6242047` feat(config): add store phone field in branding settings and persist owner phone
- `3c7dbf9` refactor(ui): premium floating store pill header and hard-remove resumo from command palette
- `5d6d2c5` fix(ui): add smooth banner fade in admin header and remove resumo from command palette
- `34373e6` refactor(admin-header): premium split layout with dynamic store banner/color identity
- `7edad7a` chore(admin-dashboard): rename storefront shortcut to monitor de pedidos
- `6954ffe` feat(admin-header): add dynamic accent color and subscription popover trigger
- `04dd2a0` refactor(admin-header): premium minimal vercel-style header with lucide icons
- `28e4552` fix(ui): prevent landing revenue truncation on mobile and normalize admin notification routing
- `f19e42f` feat(landing): add premium mobile-first social proof marquee with gradient mask
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
3. Informar perfil afetado (admin/operator/public), tela exata e passos de reproducao.

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

