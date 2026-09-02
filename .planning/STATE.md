# STATE — onde paramos

> Última etapa de TODO trabalho: atualizar este arquivo. Transitório fica na
> conversa; permanente vem pra cá (ou vira ADR se for decisão).

## Foco atual

Organização da "Claude Dev Platform" (roteiro §5 do diagnóstico) + pilotagem
do orchestrator. Produto estável em `gha.2617` (29/08 à noite).

## Últimos fechados

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
