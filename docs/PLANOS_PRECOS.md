# Planos e Preços — Já no Caminho

> **Decisão**: 28/08/2026, Edmilson. Estrutura: 2 planos (Basic = recursos essenciais, Pro = tudo) + condição **Fundador vitalícia**.
> Fontes de calibragem: dossiê verificado `.ux-audit/dossie-delivery-br-2026-08-28.html` (corredor de mercado R$90–350/mês) + base de produção (uso real por modalidade e concentração de volume, consultada 28/08/2026).
> Kit de conversa: `marketing/pitch-vip-fundador.md`.

## Tabela

| | Basic | Pro |
|---|---|---|
| **Tabela (público, pós-trial)** | **R$ 89,90/mês** | **R$ 149,90/mês** |
| **Fundador (50 primeiras lojas, vitalício)** | **R$ 69,90/mês** | **R$ 119,90/mês** |
| Anual Fundador | R$ 838,80 → R$ 712,98 (15% off) | R$ 1.438,80 → R$ 1.222,98 (15% off) |
| Trial VIP Fundador | 90 dias grátis, sem cartão | 90 dias grátis, sem cartão |

**Comissão por pedido: ZERO em qualquer plano, sem exceção.** Taxa por pedido nem fixa (princípio nº2 do PRODUCT.md — comissão zero é inegociável).

## Divisão funcional

| Recurso | Basic | Pro |
|---|---|---|
| Vitrine no hub + cardápio + pedidos | ✅ | ✅ |
| Retirada no balcão | ✅ | ✅ |
| Mesa (lançamento, comanda) | ✅ | ✅ |
| Pix direto no bolso do lojista | ✅ | ✅ |
| Gestão de entregadores | — | ✅ |
| Fluxo completo de entrega + tracking | — | ✅ |
| Gorjetas e repasses ao entregador | — | ✅ |
| Modo Balcão / fila TV | — | ✅ |
| Impressora térmica | — | ✅ |
| Condomínios e feiras | — | ✅ |

Divisão atual documentada em `docs/user-guide.md` §6; colunas de Modo Balcão/impressora/condomínios no Pro são **proposta desta decisão** (uso real: mesa 802 + retirada 597 vs delivery 17 em 90d — quem entrega paga Pro).

## Por que esses números

- **Basic R$89,90 tabela**: empata a mensalidade da AiQFome (R$89,90) **zerando** os 14,99–19,99% que eles cobram por pedido. Pitch: "mesma mensalidade, sem o percentual".
- **Basic fundador R$69,90**: valor já vigente na base (`plans.basic_monthly`) — o mais barato do corredor verificado (FoodHouse R$90+; Go Delivery R$99+). Vira condição travada, não requer mudança de preço nas linhas atuais.
- **Pro R$149,90 tabela**: alinhado ao Go Delivery Scale (R$149,90). **Pro fundador R$119,90**: valor já vigente (`plans.pro_monthly`).
- Cliente-âncora real: Datony Bacabal faz 462 pedidos/mês ≈ R$18,8k GMV — pagaria ~R$4.900/mês no plano Entrega do concorrente (~26,5%). Pro fundador ≈ 2,4% disso.

## Meta e cenários (50 Fundadores, mix 70% Basic / 30% Pro a preço fundador)

| Conversão no dia 91 | Assinantes | MRR |
|---|---|---|
| 100% | 50 | R$ 4.245 |
| 60% | 30 | R$ 2.547 |
| 40% | 20 | R$ 1.698 |
| 20% | 10 | R$ 849 |

Base: 35×69,90 + 15×119,90 = R$4.245.

## Implementação (quando for a hora — NÃO executado)

- Tabela `plans` já suporta via colunas existentes: `price` = tabela cheia, `promo_price` = preço Fundador.
  - `basic_monthly`: price 69,90 → **89,90**; promo_price → **69,90**
  - `pro_monthly`: price 119,90 → **149,90**; promo_price → **119,90**
  - Anuais idem (price ×12; promo com 15% off).
- Falta mecanismo para **limitar o promo_price às 50 Fundadores** (flag de campanha/contagem de assinaturas fundadoras) — decidir forma (coluna, feature flag ou janela de campanha) na implementação.
- Linhas `premium_monthly`/`premium_yearly` estão `enabled=f` (legado) — manter desabilitadas.
- Mudança de preço em linha já usada exige migration seguindo `backend/docs/MIGRATION_STANDARD.md` + registro em `index.ts` + atualização de `schema.sql`.

## Dados que sustentam a decisão (produção, 28/08/2026)

- 23 lojas; volume 30d concentrado: Datony Bacabal 462 pedidos (ticket R$40,71), Gustavão Espetos 28 (R$39,16), Pesqueiro Bela Vista 4 (R$248,50), demais 20 lojas zeradas (free riders a converter/limpar no ciclo dos 90 dias).
- Modalidades 90d: mesa 802, retirada 597, delivery 17, reserva 6.
- Subscriptions: trials de 7 dias, 9 EXPIRED sem conversão — **MRR real hoje R$0**; a oferta VIP Fundador é o primeiro ciclo de cobrança de verdade.
