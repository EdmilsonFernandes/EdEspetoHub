# Requisitos — vtex-hinode-catalog

> Fase 1 do SDD Janocaminho · Gate G1 · Aprovação: Edmilson (PO)
> Status: **Proposta — aguardando aprovação** | Aceito em: —
> Autor: agente (Claude Code) · Data: 2026-10-06

## Histórico de alterações

| Data | Alteração | Autor |
|---|---|---|
| 2026-10-06 | Emissão inicial | agente |

## 1. Objetivo e valor

Ingerir o catálogo público da loja **Hinode** (`www.hinode.com.br`, plataforma VTEX) para que
seus produtos apareçam como uma **loja do hub** do Já no Caminho, com sincronização agendada
mantendo preço/disponibilidade atualizados. Valor: aumenta a oferta do shopping sem esforço
de cadastro manual (465 produtos de uma vez) e inaugura o padrão de integração "catálogo
externo → loja do hub", replicável para outros e-commerces VTEX.

**Fatos verificados da origem (2026-10-06, probe real):**
- Loja em VTEX IO (conta `hinodegroup`); catálogo público acessível **sem autenticação**;
- Busca paginada: `GET https://www.hinode.com.br/api/catalog_system/pub/products/search?_from=N&_to=M`
  (retorna até 50 por página; total atual: **465 produtos** — header `resources: 0-1/465`);
- Cada produto traz: `productId`, `productName`, `brand`, `categoryId`, `linkText` (slug),
  `productReference` (código do fabricante), `items[]` (SKUs) com `sellers[].commertialOffer`
  contendo `Price`, `ListPrice`, `IsAvailable`, `AvailableQuantity`, e `images[].imageUrl`
  (`hinodegroup.vteximg.com.br`);
- **Seller único** ("Hinode") — não é marketplace multi-seller;
- `AvailableQuantity` volta como `99999` (valor de exibição, não estoque real);
- Site de origem opera por consultoras (`id_consultor` na URL) — ver Perguntas abertas.

## 2. Personas e usuários

| Persona | Descrição | Necessidade principal |
|---|---|---|
| cliente | usuário do hub (app/mobile) | ver e navegar pelos produtos Hinode como qualquer loja do hub |
| admin/lojista (operação) | Edmilson/equipe operando o admin | acionar sincronização manual e ver o status da última sync |
| consumidor da integração | a "outra IA"/engenharia que implementará | spec auto-contida, sem necessidade de re-probe da origem |

## 3. Escopo

**Incluído:**
- Importação completa e idempotente do catálogo Hinode (465 produtos) para uma **loja nova** no hub;
- Sincronização agendada (preço/disponibilidade/imagens/novos produtos/remoções);
- Acionamento manual de sincronização pelo admin, com status da última execução;
- Mapeamento de categoria da origem → categorias da loja no hub;
- Tratamento de imagem (download + otimização pelo pipeline padrão do projeto, WebP/mozjpeg, S3);
- Comportamento seguro quando a origem falha, responde parcial ou "esvazia".

**Excluído (fora de escopo nesta spec):**
- **Venda/checkout dos produtos Hinode** (modelo de venda, meio de pagamento, quem despacha,
  repasse à consultora) — depende de Pergunta aberta #1; a loja pode ir ao ar como vitrine
  enquanto isso `<A DEFINIR — confirmar>`;
- Webhook/notificação push da VTEX (sem credenciais da conta deles);
- Importação de avaliações, conteúdo rich (vídeos, descrições em HTML completo) e kits/bundles;
- Outras lojas VTEX (a spec é Hinode; a **extensão** para multi-loja é desejável e o desenho
  deve facilitá-la, mas não é critério de aceite aqui).

**Premissas e restrições:**
- Origem **pública e sem SLA**: consumo deve ser polido (rate limit autoimposto), com retry e
  tolerância a indisponibilidade da Hinode;
- Catálogo de terceiros: **nunca** deletar dados por decisão da origem sem salvaguarda (ver REQ-13);
- Integração roda no backend (Node/TypeORM) — público final consome via hub mobile (WebView);
- Sem dados pessoais envolvidos (catálogo público de produtos).

**Dependências:**
- Pipeline de imagens do projeto (S3 + otimização, já existente — uploads híbrido);
- Estrutura de loja/produto/categoria atual do hub (sem migrations destrutivas — novas
  colunas/entidades por migrations seguindo `MIGRATION_STANDARD.md`);
- Nenhuma dependência de credencial da Hinode (rota pública).

---

## 4. Histórias e critérios de aceite (EARS)

### História 1: Importação completa do catálogo

**Como** admin, **quero** importar o catálogo completo da Hinode numa única operação,
**para** ter a loja no ar com os 465 produtos sem cadastro manual.

- **REQ-1:** QUANDO uma importação é executada O SISTEMA DEVE criar/atualizar a loja Hinode
  no hub com todos os produtos ativos retornados pela origem, paginando até esgotar o total
  informado pela própria origem.
- **REQ-2:** QUANDO um produto da origem já foi importado anteriormente (mesmo identificador
  permanente da origem) O SISTEMA DEVE atualizar os dados existentes em vez de duplicar.
- **REQ-3:** QUANDO a importação termina O SISTEMA DEVE registrar o resultado (produtos
  criados, atualizados, desativados, erros) de forma consultável pela operação.
- **REQ-4:** QUANDO um produto da origem chega **sem preço válido** (nulo, zero ou negativo)
  O SISTEMA DEVE **não** publicá-lo e registrá-lo no resultado como rejeitado.
- **REQ-5:** QUANDO um produto tem múltiplos SKUs O SISTEMA DEVE importá-lo como um produto
  com variações, usando o SKU disponível de menor preço como referência de exibição
  `<A DEFINIR — confirmar regra de escolha do SKU vitrine>`.
- **REQ-6:** QUANDO um produto chega sem imagem O SISTEMA DEVE importá-lo com o placeholder
  padrão de produto do hub (não falhar a importação).

### História 2: Sincronização contínua

**Como** admin, **quero** sincronização agendada, **para** manter preço e disponibilidade
fiéis à origem sem intervenção manual.

- **REQ-7:** QUANDO o intervalo agendado completa O SISTEMA DEVE executar a mesma varredura
  da importação (criar/Atualizar/desativar) com intervalo padrão diário
  `<A DEFINIR — confirmar frequência>`.
- **REQ-8:** QUANDO um produto existia na importação anterior e **deixa de existir** na
  origem O SISTEMA DEVE desativá-lo no hub (nunca excluir permanentemente na sync automática).
- **REQ-9:** QUANDO a origem responde com erro (5xx/timeout) ou indisponibilidade O SISTEMA
  DEVE manter o catálogo atual intacto, registrar a falha e tentar novamente com backoff em
  execuções seguintes.
- **REQ-10:** QUANDO a origem responde sucesso, mas com **zero produtos** (total 0) O SISTEMA
  DEVE **não** desativar o catálogo existente e sinalizar anomalia para a operação
  (salvaguarda contra "esvaziamento" acidental do shopping).
- **REQ-11:** QUANDO a sincronização tem falhas parciais (algumas páginas falham) O SISTEMA
  DEVE concluir as páginas válidas, registrar as falhas e manter os produtos não processados
  no estado anterior (sync parcial nunca corrói o catálogo).
- **REQ-12:** QUANDO o preço de um produto muda na origem O SISTEMA DEVE refletir o novo
  preço no hub na sincronização seguinte, aplicando a política de preço configurada
  (ver Pergunta aberta #2; comportamento inicial: preço público direto, estrutura preparada
  para markup).

### História 3: Operação no admin

**Como** admin, **quero** acionar e acompanhar a sincronização pelo admin,
**para** controlar a loja sem acessar infraestrutura.

- **REQ-13:** QUANDO a operação aciona "Sincronizar agora" no admin O SISTEMA DEVE iniciar a
  sincronização e mostrar progresso/resultado ao final (nunca executar duas sincronizações
  simultâneas da mesma loja).
- **REQ-14:** QUANDO a operação abre o painel da loja Hinode O SISTEMA DEVE exibir a data/
  status da última sincronização e o total de produtos ativos/importados.
- **REQ-15:** QUANDO um usuário sem permissão de admin tenta acionar sincronização O SISTEMA
  DEVE recusar com erro de autorização.

### História 4: Loja visível no hub

**Como** cliente, **quero** ver e navegar nos produtos Hinode no hub,
**para** descobrir a marca dentro do shopping.

- **REQ-16:** QUANDO a loja Hinode está ativa O SISTEMA DEVE exibi-la no hub como qualquer
  loja (card, vitrine, categorias, busca do hub) — sem tratamento visual especial.
- **REQ-17:** QUANDO um produto da loja está indisponível na origem O SISTEMA DEVE exibi-lo
  com o estado padrão de indisponibilidade da vitrine do hub (ex.: "Esgotado" + mídia P&B,
  conforme comportamento atual).
- **REQ-18:** QUANDO o cliente abre o detalhe de um produto Hinode O SISTEMA DEVE exibir
  nome, preço, imagem e categoria no padrão das demais lojas; a ação de compra segue o
  modelo de venda decidido na Pergunta aberta #1 `<A DEFINIR — confirmar>` (até lá, botão
  inativo com rótulo "Em breve" ou redirecionamento — a decidir no design).

---

## 5. Requisitos não funcionais

| ID | Categoria | Requisito (mensurável) |
|---|---|---|
| RNF-1 | Desempenho | Importação/sync completo (465 produtos) concluído em ≤ 10 min em ambiente de produção |
| RNF-2 | Desempenho | Impacto zero no p95 das rotas do hub: ingestão roda fora do caminho de request do cliente |
| RNF-3 | Consumo respeitoso | No máximo 2 requisições simultâneas à origem e pausa mínima de 250 ms entre páginas (auto rate-limit) |
| RNF-4 | Observabilidade | Toda execução registra: início, fim, duração, por página (ok/erro), totais criados/atualizados/desativados/rejeitados; erros consultáveis pelo admin |
| RNF-5 | Compatibilidade | Loja/produtos renderizam em Android WebView (Capacitor) — mesmo padrão das demais lojas |
| RNF-6 | Privacidade/LGPD | Nenhum dado pessoal manipulado; logs sem PII |
| RNF-7 | Acessibilidade | Telas afetadas seguem o padrão WCAG 2.1 AA do projeto (componentes existentes) |

## 6. Triagem de segurança (referência, seção 5)

| Pergunta | Resposta | Consequência |
|---|---|---|
| Manipula dados pessoais/sensíveis? | Não | — |
| Envolve autenticação/autorização/perfis? | Parcial | REQ-15 cobre autorização do gatilho de sync (perfis admin existentes) |
| Nova API, integração externa ou exposição pública? | **Sim** | Critérios abaixo |
| Altera logs, criptografia, armazenamento ou infra? | Não | — |
| Dependências externas novas/atualizadas? | Não (HTTP client existente) | — |

**Critérios de segurança da integração:**
- SEC-A: URL da origem é configuração (não hardcoded em código), allowlist de domínio fixo;
- SEC-B: Resposta da origem é tratada como não-confiável: validação de schema/tamanho antes
  de persistir (produto com payload aberrante → rejeitar e registrar, não crashar);
- SEC-C: Timeout e limite de payload por página (defesa contra resposta gigante/maliciosa);
- SEC-D: Imagens baixadas passam pelo pipeline de imagem (re-encode) — nunca servidas
  por proxy direto da origem;
- SEC-E: Nunca enviar credenciais/tokens nossos à origem.

**Conclusão:** Requisitos de segurança registrados nesta seção (SEC-A..E) — integrar ao
`test_plan.md` na fase G2.

**Riscos identificados:**
- Origem muda schema/bloqueia rota pública — médio — detector de anomalia (REQ-10) + log;
- Preço NMM diferir do site por campanha/consultora — médio — Pergunta aberta #2/#3;
- Direitos de revenda da marca no nosso shopping — **alto (comercial, não técnico)** —
  confirmar com a Hinode/consultora antes do ar (Pergunta aberta #5).

## 7. Mapa de validação (REQ → como testar)

| REQ | Validação prevista | Tipo |
|---|---|---|
| REQ-1/2/4/5/6 | `yarn test` — importer com fixtures reais gravadas (página real da Hinode como mock) | auto |
| REQ-3/14 | validação manual no admin (Docker local) | manual |
| REQ-7/9/11 | `yarn test` — job com origem simulada falhando (5xx, timeout, página faltando) | auto |
| REQ-8/10 | `yarn test` — origem sem um produto / origem vazia não desativa catálogo | auto |
| REQ-12 | `yarn test` — mudança de preço refletida com e sem markup | auto |
| REQ-13/15 | `yarn test` — gatilho admin + autorização (perfil sem permissão recusado) | auto |
| REQ-16/17/18 | QA visual (playwright-visual-qa) + validação manual Docker local | manual |
| RNF-3 | `yarn test` — testador de cliente HTTP asserting intervalo/concorrência | auto |

## 8. Checklist de Definition of Ready

```
[x] Valor de negócio/técnico claro
[x] Histórias no formato "Como <persona>, quero <ação>, para <benefício>"
[x] Escopo incluído E excluído explícitos
[x] Critérios EARS objetivos — felizes, erros e bordas
[x] RNF mensuráveis (quando aplicável)
[x] Mockup/protótipo quando houver UI — N/A (usa componentes existentes do hub)
[x] Dependências identificadas (imagens/S3, estrutura de loja, migrations)
[x] Impacto de segurança avaliado (seção 6)
[x] Plano de validação esboçado (seção 7)
[ ] **Aprovação do PO (gate G1) — ato humano, pendente**
```

## 9. Perguntas abertas

| # | Pergunta | Bloqueia G1? |
|---|---|---|
| 1 | Modelo de venda: loja completa no hub, vitrine+redirect ao site Hinode, ou pedido no hub com Hinode despachando? | Não (REQ-18 já prevê os 3) — **bloqueia G2 (design de venda)** |
| 2 | Política de preço: público direto ou markup configurável? | Não (default: público direto) |
| 3 | Preservar atribuição de consultora (`id_consultor=64694267`) em links/redirecionamentos? | Não — bloqueia apenas se resposta da #1 envolver redirect |
| 4 | Frequência ideal da sync (diária/horária)? | Não (default diária) |
| 5 | Acordo comercial com a Hinode para revenda/exposição no shopping? | **Sim — bloqueia ir ao ar em produção** (não bloqueia build/staging) |
| 6 | Regra do SKU vitrine quando múltiplos SKUs (menor preço? principal?) | Não (default menor preço disponível) |
