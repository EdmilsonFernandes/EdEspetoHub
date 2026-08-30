# ADR-001 — Comissão zero: receita por mensalidade, nunca por pedido

2026 (fundação) · aceito · inegociável (PRODUCT.md)

## Context

Agregadores (iFood ~26,5%+Ads, Rappi) monetizam por comissão por pedido, o que
esmaga a margem de lojas de bairro e trava a adoção. O produto nasce como
alternativa local.

## Decision

A plataforma NUNCA cobra comissão por pedido. Receita vem exclusivamente de
mensalidade (planos Basic 89,90 / Pro 149,90; VIP Fundador trava vitalício
69,90/119,90).

## Reason

- É o único posicionamento que iFood/Rappi não podem copiar sem quebrar o
  próprio modelo de receita.
- O dinheiro do pedido cai direto no Pix do lojista — a plataforma não toca no
  fluxo (menos risco financeiro/LGPD, pitch mais forte).
- Pesquisa ago/2026 (`.ux-audit/`): corredor SaaS R$90-350/mês valida a faixa.

## Consequences

- Growth depende de converter lojistas em assinantes (não de GMV).
- Todo cálculo de "receita da plataforma" = assinaturas, nunca % de pedido.
- VIP Fundador (50 lojas, 90 dias grátis) é a oferta de aquisição ativa.
