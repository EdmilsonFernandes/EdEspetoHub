# Redesign Premium — Ata da Mesa de Gerentes (2026-10-18)

**Participantes**: Gerente de Arquitetura, Gerente de UI/UX, Gerente de Review/QA, Gerente de Produto (4 agentes, 2 rodadas de discussão cruzada, moderadas pelo orquestrador).
**Insumos**: mapeamento do fluxo real (hub→loja→cardápio→produto→checkout→Pix→rastreio), estudo dos repos ArslanAhmad03/food_delivery_ui_kit e enatega/food-delivery-multivendor, benchmark iFood de 16/08, PRODUCT.md.
**Restrição inegociável**: visual apenas — zero mudança de regra de negócio.

## Decisões fechadas

### D1 — Cor (fecha 2 decisões abertas)
- Teal `#336686` (drift de marca em prod) **sai**; volta o azul `#2F9DF7` documentado.
- **CTA verde `#15803d` definitivo** (fecha "verde × laranja" do PRODUCT.md:41). Laranja restrito a preço/promo/urgência.
- Split de token no B0: `--color-primary #2F9DF7` (gráfico/decor) × `--color-primary-ink #1A6FC8` (texto/underline/focus — AA). Motivo: 226 usos single-stop `text-primary` em 38 arquivos herdariam azul 2,6:1 ilegível. O sweep `text-primary`→ink vira parte do B0.
- Promo: texto `#C2410C`, badge bg `#FFF7ED`; `#EA580C` só gráfico grande. Warning texto `#B45309`; `#D97706` só display ≥16 bold.
- Cor da loja (catalogPrimaryColor): só pill ativa + acento 3px no header; clamp com `getContrastTextColor` (já existe); nunca CTA/tabs.
- 1 sistema de sombra unificado. Laranja vira token.

### D2 — Ordem de rollout (selada)
0. **P0s micro-batch** (antes do redesign): total no CTA do checkout (P0.3) + countdown Pix proeminente com "Pagar agora" (P1.6). 1 PR por item, presentation-only, ≤2d.
1. **B0 tokens** — swap + split + sweep + sombras + QA admin + check 1-linha Dr. Exame (nginx/compose).
2. **B1 vitrine** — MenuView: rail categorias sticky (scrollTo+debounce ~450ms), ProductRow linha flat + "+" 36px + foto quadrada 88px, tabs rose→azul, carrossel populares, header unificado mantém + RatingPill restyle.
3. **B2** — ProductModal (footer stepper + preço vivo pulsante) + CartBar (substitui a sacola sticky no MESMO slot, mesmo handler `setView('cart')`).
4. **B3 estados** — skeleton fiel, esgotado (opacity .5 + badge slate, não rose), fechado (vitrine navegável + banner warning), vazio, erro/retry.
5. **Ciclo 2** — checkout 1 página (segment control dos 4 contextos), Pix/tracking (mapa hero + ETA grande, timeline vertical), hub core-first, RatingPill agregado onde faltar dado. AAB único no fim do ciclo 2.

### D3 — Regras de implementação
- 1 PR = 1 tela, always-green; revert também é PR (gates + approval). Sem flag, sem branch longa (≤2d).
- Markup novo só em componente novo **tipado**; arquivos `@ts-nocheck` gigantes apenas compõem (mata TDZ na origem).
- Gates por push: `test:unit` + `npm run build` (sem pipe tail) + review TDZ manual em diff nocheck + Playwright visual QA (baseline capturada ANTES de cada batch) + Actions via API pública + hash do bundle pós-deploy.
- `data-testid` estáveis + automações `.ux-audit/` verdes no MESMO PR.
- Perf: animar só transform/opacity; sombra estática; ProductRow memoizado + `content-visibility:auto`; FPS medido com 100+ itens em WebView de entrada ANTES de aprovar (não virtualizar neste ciclo).
- Intocados: comprovante térmico 58mm, taxa de entrega SEM ⓘ (veto Edmilson), nomes/estrutura dos 4 contextos, fila pós-pagamento.

### D4 — Escopo do mock (marcador anti-desvio)
FORA: gorjeta/tip pills, agendamento de horário, GPS do motoboy, banners CMS, dark mode, rating em card de produto individual.
RatingPill: SÓ header da loja com `avgRating > 0` (dado já existe — MenuView.tsx:213/466; visual-only confirmado). Threshold "≥5 avaliações" = mudança de regra, fica fora.
Carrossel "Mais pedidos hoje": label só com ranking real; sem ranking → "Destaques da loja" (curadoria do lojista via flag existente).
Fallback sem foto: tile tipográfico (inicial + pictograma da categoria) sobre tint da cor da loja; carrossel >40% sem foto degrada inteiro pra tiles; <3 itens elegíveis → lista flat. Nunca stock photo.

### D5 — Critério de sucesso do mock (Produto, inegociável)
O lojista-prospect reconhece SEU produto na vitrine em <5s (logo + cor da loja dominantes). Reconhecível pro operador atual, paridade visual com iFood, zero promessa falsa, cores da marca. Mock entra no roteiro de venda do VIP Fundador.

## Revisões após 1ª revisão do Edmilson (18/10)

1. **Rail vertical de categorias: VETADO** ("fica bem feio"). Categorias seguem em **pills horizontais 40px sticky** sob as tabs, com scroll-spy + debounce 450ms — o padrão que já existia em prod e o do iFood BR. Componente passa a ser `CategoryChips.tsx` (não CategoryRail).
2. **Checkout MESA corrigido no mock**: mesa = **comanda aberta** — pagamento SÓ quando o cliente pede pra fechar (aí escolhe Pix no balcão / dinheiro / cartão). É o fluxo atual, inclusive o pedido lançado pelo admin do lojista como mesa. CTA do mock agora é "Enviar pra cozinha · Mesa 12", sem cobrança na hora. Entrega/Retirada seguem pagando na confirmação (fila pós-pago).
3. **HUB entrou no mock** (seção 00, ciclo 2, último batch): core-first — endereço + busca 48px no topo, chips de contexto (Meu Condomínio/feiras/segmentos), **lojas abertas na primeira dobra** (hoje ~2,5 dobras de hero institucional antes), fechadas em cinza logo abaixo, destaques como faixa compacta depois das lojas. Discovery geo por raio e o card informativo da loja: intocados.

## Arquivos
- Mock (artifact + HTML): `.ux-audit/redesign-premium-2026-10-18/mock-premium.html` — frames 390px + lg, tokens com nomes do código, ~24 estados, mapa mock→código, hub core-first.
- Esta ata é o contrato da mesa; divergências futuras resolvem-se aqui, não reabrem o debate.
