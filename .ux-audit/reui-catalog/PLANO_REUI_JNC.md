# Plano ReUI × Já no Caminho (29/10/2026)

> Licença **ReUI Premium Ultimate** (All-Access) — todos os blocos liberados.
> MCP `reui` registrado em `.mcp.json`; token OAuth já em `~/.claude/.credentials.json`.
> Catálogo completo: `.ux-audit/reui-catalog/ecommerce-blocks.txt` (87 blocos com descrição).
> **Parte 2 (29/10, v2)**: varredura das outras famílias via MCP — Application (305),
> Solutions (82), Marketing (67), Data-Grid (57), Chart (52). O que serve virou as
> seções **A1–A7** abaixo; ecommerce (E1–E5) segue como Parte 1.

## Regras inegociáveis (valem mais que qualquer bloco)

1. **Checkout continua multi-step** (Sacola→Receber→Pagamento→Confirmar). Checkout de 1 página foi vetado pelo Edmilson (19/10). Blocos de checkout entram só como **sub-elementos** (stepper, resumo, endereços salvos).
2. **Comissão zero**: nada na UX que sugira taxa da plataforma sobre lojas.
3. **Marca preservada**: azul `#2f9df7`/`#2563EB`, CTA verde `#15803d`, laranja só alerta; ícones **Phosphor** (blocos vêm com lucide — trocar); copy PT-BR; R$.
4. Front segue React 19 + Tailwind 4 (ReUI é Tailwind 4 + CVA + Radix — compatível; Radix entra só onde JNC não tem equivalente).
5. Mobile-first: tudo validado em 320–430px; sheets precisam de flex/min-h-0 (pagamento já quebrou por isso).

## E1 — Pedidos do cliente (impacto alto, risco baixo) 🥇

| Bloco ReUI | Onde | Resolve | Prioridade |
|---|---|---|---|
| `receipt-2` (Timeline placed→delivered + Track + detalhes) | OrderTracking / card expandido do pedido | Histórico com linha do tempo estruturada + itens/totais/pagamento no mesmo lugar | Alta |
| `receipt-4` (Delivered hero + "Avaliar"/"Pedir novamente") | Pedido entregue | Fecha o loop com a tab Avaliações (19d808c8) + reordem em 1 toque | Alta |
| `receipt-1`/`receipt-6` | SuccessView / comprovante Pix | Comprovante pós-compra decente (já era proposta em docs/) | Média |
| Charts `status-tracker` (3 blocos) | Alternativa/complemento ao timeline do rastreio | Passos visuais do status (som de status já existe 11569cf3) | Média |
| Application `empty-state` (14) | Pedidos vazio, destinos vazio, busca sem resultado | Estados vazios desenhados (padrão da sacola vazia 23d05d51) | Alta |

## E2 — Vitrine / MenuView (impacto alto, risco médio)

| Bloco ReUI | Onde | Resolve | Prioridade |
|---|---|---|---|
| `review-3` (nota agregada + distribuição de estrelas + lista com selo) | Tab Avaliações | Hoje é lista simples; endpoint público de reviews já existe | Alta |
| `coupon-4` (card de oferta copiável) + `coupon-5` (banner dismissível) | Vitrine/sacola | Cupom visível = conversão (BFF já aplica; ghost coupon já corrigido 187468d9) | Alta |
| `product-grid-3` (grid frameless, Add full-width) | Lista de produtos | Refinamento da densidade iFood-like (f369c349) | Média |
| `product-card-3` (horizontal quick-buy, badge low-stock, preço riscado) | Destaques da loja | Card de destaque com urgência/disponibilidade | Média |
| `shopping-cart-6`/`-7` (mini-cart popover/drawer com subtotal) | Badge da sacola no MenuView | Feedback imediato ao adicionar | Média (cuidado: sheet em 375px) |

## E3 — Destinos / cidades turísticas (a área mais nova, mais a ganhar) 🗺️

| Bloco ReUI | Onde | Resolve | Prioridade |
|---|---|---|---|
| `shop-hero-5` (2 coleções lado a lado, foto full-bleed) | `/destinos` — hero com as 2 primeiras cidades (SFX + SBS) | Entrada turística de impacto; escala p/ 4+ com `shop-hero-8` (grid 2x2) | Alta |
| `category-card-4` (hero de departamento + sidebar de categorias + counts) | `DestinationDetailPage` | Cidade com hero + navegação chalés/pousadas/passeios/restaurantes | Alta |
| `category-card-5` (linhas image-led, badge de status, meta) | Listings editoriais (passeio/massagem/noite/atrativo) | Curadoria local legível | Alta |
| `comparison-3` (3 cards: best value / editor's choice / premium) | Chalés/pousadas do destino | Curadoria "melhor custo-benefício / romântico / premium" — linguagem de turismo | Média |
| `product-detail-2` (filmstrip gallery + sticky buy-box) | `HospitalityPlacePage` | Página do chalé: fotos + CTA "Pedir informações" (WhatsApp) + lojas que entregam | Média |

## E4 — Hub (app home)

| Bloco ReUI | Onde | Resolve | Prioridade |
|---|---|---|---|
| `shop-hero-4` (hero com 4 tiles de categoria + count) | Home do hub | Substitui/refina o hero atual com acesso direto às verticais reais | Média |
| `category-card-1` (grid 4 colunas, hover browse) | Tiles de categoria (evolui onda 3) | Foto + contagem por categoria | Média |

## E5 — Sacola/checkout (SÓ sub-elementos)

| Bloco ReUI | Onde | Resolve | Prioridade |
|---|---|---|---|
| `shopping-cart-2` (resumo sticky: entrega/taxa/total + cupom) | Step Sacola | Hierarquia de totais no padrão ReUI | Média |
| `shopping-cart-4` (toggle entrega/retirada com taxa) | Padrão **visual** do seletor de modalidade | Semântica continua por PEDIDO (não por item) | Média |
| `checkout-5` (stepper animado) | Apenas o indicador de progresso do fluxo atual | Consistência visual sem mudar o fluxo | Baixa |
| `checkout-2` (saved addresses) | Padrão de lista de `customer_addresses` | Endereços salvos consistentes | Baixa |

## Parte 2 — Application + Solutions + Marketing (varredura MCP 29/10)

Regras que só aparecem aqui (além das inegociáveis lá em cima):

- **Sheets ReUI são right-inset (drawer lateral)** — servem ao **admin desktop**. Bottom-sheet mobile do JNC continua com padrão próprio (flex/min-h-0 — pagamento já quebrou por isso).
- Blocos com DataGrid puxam `@tanstack/react-table`; os de dashboard puxam `recharts`/`date-fns`/`react-day-picker`. Deps novas **só no admin web** (code-split existe), nunca na vitrine/hub mobile.
- Instalação traz código-fonte shadcn (lucide + tokens ReUI): portar para `frontend/src/components/reui/`, trocar ícones por **Phosphor** e amarrar cores nos tokens JNC (azul `#2563EB`, CTA verde `#15803d`).
- Kanban/DataGrid trazem `@base-ui/react` + `@dnd-kit` — conferir peso e licença antes do primeiro uso.

### A1 — Pedidos online do lojista (AdminOrders) 🥇 maior ganho operacional

| Bloco ReUI | Onde | Resolve | Prioridade |
|---|---|---|---|
| `kanban-board-2` (colunas de status colapsáveis, drag&drop de cards, count badges) | AdminOrders: Novo→Confirmado→Preparando→Pronto→Saiu→Entregue; arrastar card = mudar status (ação já existe no backend) | Fila da cozinha de um olhar; menos toques pra avançar status | Alta |
| `kanban-board-6` (chips de SLA + badge de prioridade) | Mesma tela: chip de tempo no card | "pedido parado há 23 min" visível — dor real do balcão | Alta |
| `solution-inventory-11` (Order Details: itens + totais + timeline de rota + stepper de status) | Drawer lateral de detalhe do pedido no admin | Tudo do pedido num lugar (hoje é expandir-linha) | Alta |
| `solution-inventory-5` (4 KPIs + gráfico velocity + top categorias + tabs Produtos/Atividades/Pedidos) | Home do lojista | Painel da loja no padrão ReUI | Média |
| `dashboard-7` (KPIs c/ sparkline + área empilhada + fila paginada) | Evolução do "em números" | Painel refeito c6bd964f; só se quiser subir de nível | Baixa |

⚠️ AdminOrders.tsx é arquivo grande e já congelou 1× (B4, TS17008): batch pequeno, teste de paridade, `npm run build` (não só tsc).

### A2 — Conta / Perfil (menu vertical)

| Bloco ReUI | Onde | Resolve | Prioridade |
|---|---|---|---|
| `profile-3` (avatar upload, campos de identidade, e-mail verificado) | Conta do cliente (nome, telefone, CPF 52caeb6e) | Form de conta no padrão ReUI | Média |
| `profile-1` (sidebar vertical de tabs: Perfil/Notificações/Endereços/…) | **Padrão do menu vertical** — admin desktop vira sidebar; no app (320–430px) vira lista agrupada com o mesmo visual | Estrutura pro menu vertical do perfil | Média |
| `profile-8` (plano atual + uso + faturas) | Assinatura do lojista (Basic/Pro/Fundador) | Fecha o loop dos planos no painel (junto com A5) | Média |

### A3 — Admin produtos/estoque

| Bloco ReUI | Onde | Resolve | Prioridade |
|---|---|---|---|
| `solution-inventory-6` (grid c/ stock health bar + filtros + paginação) | Admin de produtos (disponível/indisponível) | Lista simples de hoje ganha grid filtrável | Média |
| `wizard-6` (wizard de produto: dados→galeria→preços) | Cadastro/edição de produto | Form longo vira passos; **cortar** matriz SKU (sem variantes) | Média |
| `solution-inventory-8`/`-3` (regras de reposição, low-stock) | Só quando existir estoque quantitativo | Hoje o produto só liga/desliga | Futuro |

### A4 — Hub / carrossel (complementa E4)

| Bloco ReUI | Onde | Resolve | Prioridade |
|---|---|---|---|
| `category-card-3` (carrossel paginado de coleções, badge de contagem) | Carrossel de categorias/verticais no hub | Carrossel que não existe hoje | Média |
| `product-card-4` (carrossel shoppable, badge de desconto/urgência) | Destaques da loja (alternativa ao `product-card-3` da E2) | Destaques em carrossel com urgência | Média |

### A5 — Planos / billing (Basic 89,90 · Pro 149,90 · Fundador travado)

| Bloco ReUI | Onde | Resolve | Prioridade |
|---|---|---|---|
| `solution-billing-10` (plano atual + upgrade + uso + faturas) | Página Assinatura do lojista | Lojista vê/gere o plano (preços `founder_*` intocados; cuidado com upsert de boot que regrava preços) | Média |
| `pricing-5` / `pricing-4` (seção de preços marketing) | Site/parceiros | Refresh visual da tabela própria (e6055053) quando quiser | Baixa |
| `stats-3` (barras por tier + "expirando") | Superadmin | Métricas SaaS de assinantes | Baixa |

### A6 — Destinos / cidade turística / chalé (complementa E3)

| Bloco ReUI | Onde | Resolve | Prioridade |
|---|---|---|---|
| `solution-bookings-4` (room board: gantt de estadias, drag p/ mover, chegadas do dia) | Quando RESERVA de chalé existir (hoje é listagem+WhatsApp) | Frente de recepção completa — gantt+cascader pesados | Futuro |
| `solution-bookings-2` (agenda dia/semana c/ conflitos) | Se passeios ganharem horários | Agenda de passeios | Futuro |

### A7 — Rastreio / mapa

| Bloco ReUI | Onde | Resolve | Prioridade |
|---|---|---|---|
| `solution-map-1` (dispatch de frota MapLibre ao vivo) | Dispatch de motoboys | GPS do motoboy foi adiado (onda 3); bundle puxa `maplibre-gl` | Futuro (B3+) |

### Ordem sugerida (alinhada ao rollout P0s→B0→B1→B2→B3 em andamento)

1. **A1 kanban do AdminOrders** — ganho operacional imediato pro lojista (batch pequeno pelo risco do arquivo).
2. **A2 Conta/Perfil** (profile-3 + padrão do menu vertical).
3. **A3 produtos** (inventory-6 + wizard-6).
4. **A5 assinatura** (billing-10).
5. A4 entra junto com E4 (hub) do rollout; A6/A7 ficam presos a feature nova (reserva, GPS).

## Descartados (avaliados e excluídos)

- **`wishlist-1..6`** — app não tem favoritos; "lojas favoritas" é backlog distante.
- **`filter-sidebar-1..7`** — desktop-first; hub/vitrine são mobile com pills (busca-no-menu até foi descartada pelo Edmilson).
- **`checkout-1..7` como fluxo completo** — veto ao 1-página; substituir o fluxo inteiro é risco alto sem ganho.
- **`comparison-1/2/4/6`** — tabelas técnicas largas; só o `comparison-3` (cards de recomendação) serve.
- **`product-detail-4/6`** — layouts livro/revista, não cabem em comida/serviço local.
- **`category-card-2/3`** — filtros/fit/size de moda, semântica não aplica.
- **Template e-commerce completo** — brief: não virar e-commerce genérico; usamos blocos, não o template.
- **Application/Solutions — segue fora** (revisto na varredura 29/10): Whiteboard/Rich Text/Flow/Event Calendar/Schedule/Gantt (não existem no produto; reserva de chalé reabre o Gantt — A6), App Shell (nav admin unificada 29/08 — não reescrever o chrome; exceção futura `app-shell-8` se o admin ganhar 2º nível de navegação), Auth (login funciona; mexer = risco sem ganho), Onboarding (banner one-time atende), Navbar (são toolbars/marketing; hub tem header próprio), Timeline standalone (pedido usa `receipt-2`/stepper), CRM/Users/Analytics/Digital-twin (superadmin não é CRM), AI-agents (22) e data-grid avançado (editing/grouping/drag-drop/virtualization) — DataGrid entra só onde A1–A3 pedirem. Dashboard: só `dashboard-7` ficou de fora como opção baixa (A1).

## Gates por etapa

- `npm --prefix frontend run test:unit` + `npm run build` (MenuView tem `@ts-nocheck`: conferir escopo/TDZ no diff).
- Playwright visual QA em 375px/390px (ritual da rotina de auditoria).
- Mobile afetado → ritual AAB (versionCode+1, `npm --prefix mobile run android:sync`, clean bundleRelease).
- Push → conferir Actions (deploy automático com approval do Edmilson).
