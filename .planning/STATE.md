# STATE — onde paramos

> Última etapa de TODO trabalho: atualizar este arquivo. Transitório fica na
> conversa; permanente vem pra cá (ou vira ADR se for decisão).

## Foco atual

Organização da "Claude Dev Platform" (roteiro §5 do diagnóstico) + pilotagem
do orchestrator. Produto estável em `gha.2617` (29/08 à noite).

## Últimos fechados

- 30/10 — **Venda por unidade × peso (kg)**: produtos ganham modalidade de venda
  (`products.sale_unit` UNIT|WEIGHT + `weight_min_g`/`weight_step_g`; migration
  20261030_001, default UNIT = nada muda para o existente). Pedido por peso usa
  GRAMAS inteiras como quantidade canônica; backend valida mín/incremento
  (ORDER-014) ANTES da baixa de estoque e calcula subtotal em centavos inteiros
  `round(preço/kg¢ × g ÷ 1000)` — front replica a mesma fórmula (utils/saleUnit
  espelhado). Item do pedido ganha snapshot (`sale_unit` + `unit_price_snapshot`)
  — mudança no cadastro nunca recalcula pedidos antigos. Bundle promo ("leve X")
  só para unidade; troca de modalidade com estoque > 0 é bloqueada (PROD-003).
  UI: cadastro (ProductManager) com por unidade/peso + mín/incremento; vitrine
  "R$ 10,00/kg"; modal com degraus (250→500 g…), subtotal fechado e aviso de
  excedente; sacola/checkout/painel/tracking/impressão mostram "500 g", nunca
  "500x". E2E 4/4 (Chrome+Safari) com API mockada (page.route) + 17 unit
  backend + 10 unit frontend. Pendências: top-items agrega gramas no "mais
  pedidos" (display); specs e2e ANTIGAS falham no dev local por causa do
  VITE_API_BASE_URL externo (baseline confirmado sem as mudanças — os mocks
  `**/api/**` não casam; rodar via Docker :8080 ou ajustar globs).

- 19/10 (noite) — **Benchmark iFood×99 aplicado ao fluxo cliente** (reverso de 3 APKs
  verificados; ver `docs` da sessão no repositório Meus Exames): auditoria confirmou que
  card fechado+próxima abertura, preço âncora, busca no cardápio, carrinho flutuante,
  stepper e reorder JÁ existiam (ciclos 1-2). Lacunas reais implementadas: (1) upsell
  cross-item no ProductModal ("Que tal completar?" — sugestão abre o item p/ revisar,
  bebidas/sobremesas primeiro); (2) estado vazio desenhado da Sacola (step 1) com CTA
  "Ver cardápio"; (3) `font-variant-numeric: tabular-nums` global (preços alinham).
  tsc limpo + CartView.paymentSheet 2/2. Próximas lacunas reais: ~~sons de evento~~
  (✅ commit f688c0b0 — chime Web Audio no rastreio), código de entrega pro CLIENTE
  (⚠️ o código JÁ EXISTE no backend — `DeliveryService` envia por push e o motoboy
  vê em MotoboyCurrent; falta SÓ expor `deliveryCode` no endpoint de order do
  cliente, respeitando auth de dono, e exibir no OrderTracking quando sair pra
  entrega) e CTA de avaliação pós-entrega (reviews já existem — StoreReviewsTab;
  falta CTA no estado entregue). Celebração pós-pedido e som de loja já existiam.

- 19/10 — **Rollback "checkout 1 página" + cadeia Asaas no PIX de pedido**:
  (1) CartView volta ao multi-step Sacola→Receber→Pagamento→Confirmar (stepper
  restaurado, guards por etapa, voltar = etapa anterior) — rollback CIRÚRGICO
  que preserva o azul #2563EB e o resto do ciclo 2 (Edmilson rejeitou só o
  P1.2); (2) checkout e balcão PIX agora honram `resolvePlatformPixChain`:
  Asaas (≥R$5) → OpenPix → MP da loja — antes o gate `isOpenPixPlatformPixEnabled()`
  só ligava com `PAYMENT_PROVIDER_DEFAULT=openpix`, então com `=asaas` o PIX
  caía DIRETO no MP OAuth da loja. Polling `refreshFromProvider` ganha branch
  ASAAS; OrderPayment.provider aceita 'ASAAS' (varchar, sem migration).
  **ASAAS_API_KEY resolvido (19/10 noite)**: key de prod copiada do Dr Exame
  (mesma conta LTDA) e o bug-raiz era o Compose v2 interpolar o `$` inicial da
  key em env_file → string vazia desde 03/10. Escape `$$` aplicado em
  `backend/.env.docker` no EC2 (backup .bak-20261019); `docker compose config`
  confirma resolução. **ATIVA = próximo deploy que recriar o backend** (approval
  do Edmilson) — até lá a cadeia roda openpix→mp.
- 19/09 — **Portal (www) "demora e só carrega no reload" — fix no SW +
  logos WebP** (7b21f303 no ar/verificado; 8f55baa9 deploy via approval):
  navigateFallback cache-first servia index do precache VELHO pós-deploy →
  entry chunk 404 → tela presa (o recovery mora no JS que nem carregou).
  Navegação agora é NetworkFirst (cache só offline), + watchdog inline no
  index.html (script falha → unregister SW + reload 1×). Logos do portal em
  WebP: 1,63MB→243KB (uaiid-shield 820→58KB q92 — q90 degradava linhas finas).
- 02/09 — **Pendências do dashboard mortas** (64348832, deployado e validado):
  (1) Pix 4390 já estava morto (91e90f33 na imagem + Pix pago 01/09 sem falhas
  novas; alerta decai com a janela); (2) delivery-billing virou fetch lazy na
  aba Pagamentos — console do dashboard sem 4xx; (3) receita agora conta só
  pedidos reais: snapshot + analytics + clientes excluem cancelled e
  awaiting_payment (filtro canônico do movimento); migration 20260902_001
  purgou snapshots → recompute 250ms depois. Efeito: loja-guinea 30d
  R$1.922→R$1.364 (R$546 cancelados fora), all-time R$10.752→R$7.905 (26%
  de inflação histórica removida), 369→268 pedidos. periodRevenue agora ==
  comparison.current até o centavo.
- 01/09 — **Dashboard admin "em números" — NO AR e verificado** (c6bd964f +
  fixes 9c4580e1 e 0bc93dd7): Onda A backend ganha byPaymentMethod +
  comparison + pixHealth + bestDay no dashboard-analytics; Onda B frontend
  substitui os 2 blocos de KPI duplicados por 4 tiles com delta, bar-chart vira
  área com crosshair+recorde, card "Como o cliente pagou", alerta Pix grave
  (16 falhas × 1 pago do Gustavo AGORA visível todo dia), período sobe pra
  junto dos números. Lições de coerência aplicadas em prod: delta compara a
  MESMA base do número (snapshot/all-status), tiles de pedidos/ticket usam o
  período (não all-time), labels cobrem debito_presencial. Conhecido: 400 em
  /delivery-billing no load é tolerado por design (catch).
- 31/08 (noite) — **Point ponta a ponta em prod + ciclo completo validado**:
  paga→fecha→retirada automática ✓, seletor de forma dentro do Cartão ✓,
  celebração do pagamento ✓, UX Pix limpa ✓. 11 commits no dia, último
  1e232083 (comprovante do pedido impresso NA maquininha via API de ações —
  best-effort, dispara no reconcile quando Point confirma).
- 31/08 — Matriz de resiliência entregue (P0 hint/reenviar, P1 webhook order
  + refresh token, P2 copy/atalho dinheiro).
- 29/08 — Menu admin unificado; AAB v117; docs/claude-platform/; preços 2 planos.

## Em andamento / em risco

- **Pro 3 física — caso no MP**: push de orders nunca acontece no aparelho
  (pull-only: só chega no "Atualizar"). TODAS as variáveis eliminadas: payload
  validado pelo MP, modo PDV, re-pareamento (pos/store novos), permissões
  In-store Integration + Terminal Actions habilitadas, 4G próprio e Wi-Fi,
  tela em prontidão, duas gerações de API (Orders e Intents legada), software
  3.6.2 atualizado (10/08). Protocolo: **WCS-48575 / Support 479235834** —
  aguardando técnico; resposta nivel-1 citou "divergências" que eram leitura
  errada de screenshot (réplica técnica com POST/GET reais enviada). Se
  persistir → troca em garantia. Sistema 100% pronto pra receber a maquininha
  que entregar push.
- **Webhook tópico order ATIVO** (31/08, via MCP save_webhook — payment
  mantido, 98% saúde): validar com pagamento real (R$1) → log "order webhook
  processed" + fechamento ~1s. Edmilson testa depois.
- Comprovante impresso: nossa via API aguarda o canal do terminal; térmica é
  a via garantida.

## Próximos

1. Validar webhook order com pagamento real (fechamento instantâneo).
2. **P0 resiliência**: hint "toque Atualizar na maquininha" + botão
   Cancelar-e-reenviar (padrão Berga/Datacaixa) — aguarda OK do PO.
3. Botão "Ativar modo integrado (PDV)" no painel — self-service do PATCH.
4. Refresh automático do token OAuth (seguro contra expiração).
5. Fix 4390 no DeliveryBillingService; teste de render do ChargeSheet.

## Decisões pendentes

- Remover notificação FGS do Modo Balcão (v79+) → decide Edmilson.
- CTA verde × laranja no consumidor → registrado, não decidido.
