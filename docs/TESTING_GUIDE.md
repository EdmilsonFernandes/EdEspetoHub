# 🧪 EdEspetoHub - Guia Oficial de Testes

Bem-vindo ao guia de arquitetura de testes do **EdEspetoHub**. Este documento é a bússola para qualquer desenvolvedor que chegue no projeto para rodar, debugar ou criar novos testes no nosso ecossistema em Docker.

---

## 1. O Cenário & Premissas

O EdEspetoHub é um sistema distribuído de alta complexidade. Ele possui 5 módulos principais rodando simultaneamente via Docker Compose:
- **Frontend** (Vite/React) na porta `:8080`
- **Backend API** (Node) na porta `:4000`
- **Face-Worker** (Python/AI Biometria)
- **Maps** (Serviço de Bússola/Geo)
- **Postgres** (Banco de Dados principal)

**Premissa Maior:** **Nunca rodar testes E2E (End-to-End) contra o banco de produção!**
Os testes E2E simulam clientes reais comprando espetos de carne. Se você rodar em produção, você vai sujar o banco com pedidos "Teste do Playwright" e bagunçar a contabilidade do lojista. Todos os testes são feitos contra o ambiente LOCAL (Docker).

---

## 2. A Pirâmide de Testes no EdEspetoHub

Temos três níveis de testes:
1. **Testes Unitários (Rápidos):** Rodam com *Vitest* isoladamente no host. Validam funções de matemática (PIX, Carrinho). Não precisam do Docker de pé.
2. **Testes de Componente (Rápidos):** Validam botões, Modais e Squircles do UI sem chamar banco de dados.
3. **Testes E2E (Robôs Demorados):** Rodam via *Playwright*. Eles ligam um Google Chrome invisível, abrem o `localhost:8080`, logam com biometria/senha e fazem uma simulação real ponta a ponta.

---

## 2.1. Matriz Atual de Cobertura E2E

Esta matriz descreve os fluxos já cobertos hoje. Use ela antes de criar teste novo para evitar duplicidade e para enxergar lacunas reais.

### Backend API E2E

Os testes ficam em `backend/src/test/e2e` e rodam contra banco de teste local, recriado pelo `globalSetup`.

| Arquivo | Cobertura principal |
| --- | --- |
| `auth.test.ts` | Cadastro/login de lojista, cliente e motoboy; validações de registro; aceite de termos; email duplicado; login admin; autorização por role; MFA TOTP com dispositivo confiável; bloqueio por muitas tentativas inválidas. |
| `products.test.ts` | CRUD de produtos do lojista; validação de campos obrigatórios; preço negativo; listagem por loja; atualização; isolamento entre lojas. |
| `orders.test.ts` | Jornada do cliente no pedido: consulta de catálogo público, criação de pedido, rejeição por estoque insuficiente, fila da loja, observação do cliente, atualização de status, tracking público, entrega postal com/sem rastreio, validação de código postal e rejeição de pedido sem item. |
| `operator-orders.test.ts` | Fluxo do lojista/operador: criação de pedido com múltiplos itens, pedido de mesa, fila operacional, transições de status, detalhe público, retirada, edição de itens, item operacional/manual com preço customizado, transição inválida, autenticação e isolamento entre lojas. |
| `full-order-flow.test.ts` | Fluxo completo ponta a ponta: loja configura horário/tipo de pedido/produto, cliente cria retirada e entrega, motoboy é registrado/vinculado/aprovado, entrega é aceita/retirada/entregue, tracking, histórico e ganhos do motoboy. |
| `delivery.test.ts` | Área do motoboy: perfil autenticado, fila de pedidos disponíveis, ganhos do dia, histórico e proteção de endpoints por token/role. |
| `motoboy-delivery-acceptance.test.ts` | Concorrência de entrega: dois motoboys aptos veem o mesmo pedido, o primeiro aceita e o segundo recebe conflito `409 DELIV-006`. |
| `motoboy-delivery-security.test.ts` | Segurança do fluxo de entrega por motoboy, incluindo regras de acesso e proteção operacional. |
| `motoboy-store-managed.test.ts` | Motoboy criado/gerenciado pela loja com acesso próprio por username/senha; bloqueio de liberação sem KYC e liberação após documentos aprovados. |
| `customer-addresses.test.ts` | Endereços do cliente: criação, troca de endereço principal e promoção automática de outro endereço ao excluir o principal. |
| `subscription.test.ts` | Assinatura/plano: plano ativo permite produto, plano expirado bloqueia pedido, reativação restaura acesso, listagem de planos e status da assinatura da loja. |
| `destinations.test.ts` | Destinos/chalés/serviços: criação de destino real, hospedagem, listing, vínculo com loja, conflito de slug, destinos inativos no admin, solicitações de parceria, aprovação/link de loja, claim de perfil existente sem duplicar, proteção antifraude contra aprovação sem conferência/segundo dono ativo, reenvio de convite e portal do parceiro com ativação, permissão e edição segura. |

### Frontend Playwright E2E

Os testes ficam em `frontend/tests/e2e`. Eles validam UI e navegação crítica, preferencialmente com APIs mockadas quando o fluxo visual é o foco.

| Arquivo | Cobertura principal |
| --- | --- |
| `auth.spec.ts` | Smoke test da tela principal/autenticação em viewport mobile. |
| `admin-queue-ux.spec.ts` | UX da fila do lojista: abre detalhe do pedido, picker de produto com imagem/categoria/preço, detalhe centralizado no web, agrupamento por mesa e chips/modal de item avulso, couvert e taxa de serviço. |
| `client-orders-account.spec.ts` | UI do cliente: filtros de pedidos com contadores, preview de imagem do item, conta do cliente, endereço principal e telefone mascarado na edição de perfil. |
| `destination-whatsapp-location.spec.ts` | Fluxo visual de destinos/chalés: WhatsApp com endereço/mapa da hospedagem, contexto da hospedagem carregado para lojas oficiais e tela de rota com mapa, logos, distância e navegação sem voltar duplicado. |
| `destination-partner-portal.spec.ts` | Portal do parceiro de destinos: ativação por convite, login, listagem de cadastros liberados e salvamento de campos operacionais seguros com API mockada. |
| `superadmin-destinations-partners.spec.ts` | Super Admin de destinos: filtros de onboarding, modal de validação de posse, comparação de cadastro atual vs solicitação e exigência de registro de conferência antes da aprovação. |
| `hub-marketplace.spec.ts` | Home/Hub do marketplace: carregamento de lojas, filtros principais, dados de card, itens em destaque, link "Ver mais" e busca na tela de destaques. |
| `postal-order-tracking.spec.ts` | Tela pública do pedido postal: card de rastreio dentro do app, código copiável, timeline postal e estado sem código informado. |
| `store-checkout-layout.spec.ts` | Checkout visual da vitrine: restauração de sacola, observação, troca de pagamento por bottom sheet, retirada, entrega com endereço salvo/taxa, mesa e bloqueio de entrega fora do raio antes de criar pedido. |

### Unitários Relevantes

Além dos E2E, existem unitários cobrindo partes sensíveis que não devem virar Playwright:

| Área | Exemplos de cobertura |
| --- | --- |
| Precificação/pedidos | Cálculos de preço, promoções e regras internas de `OrderService`. |
| Pagamentos/reembolso | Validações do `OrderPaymentService`, especialmente refund e payloads sem cobrar pagamento real. |
| Segurança/riscos | Email descartável, bloqueios de cliente e regras antifraude. |
| Portal parceiro de destinos | Sessão frontend, login, ativação, rotas protegidas com `authMode: partner` e atualização de chalé/serviço pelo service do portal. |
| Turismo/seeds | Massa de dados de turismo para Gonçalves e São Bento. |
| Upload/storage | Regras de caminho público/privado de imagens. |

### Lacunas Conhecidas

Estas áreas ainda merecem testes adicionais antes de chamar a cobertura de "muito alta":

| Lacuna | Recomendação |
| --- | --- |
| Checkout com pagamento online sandbox/webhook | O checkout visual de retirada, entrega e mesa já está coberto por Playwright mockado. Ainda falta contrato sandbox para Mercado Pago: status `awaiting_payment`, webhook aprovado/expirado, falha e reembolso sem pagamento real. |
| Pagamento Mercado Pago real | Não usar pagamento real em E2E comum. Criar sandbox/mock para payload, status `awaiting_payment`, webhook aprovado/expirado e falha. |
| Push notification ponta a ponta | Testar backend por contrato/payload e mockar provedor. Push real em dispositivo deve ser checklist manual/release, não E2E automático. |
| Impressão RawBT/Android | Cobrir fallback/intent por unitário ou teste de integração do adaptador. Impressão Bluetooth real deve ficar em checklist manual de release/AAB. |
| UI completa de minha conta/endereço | Conta e endereço principal já têm smoke Playwright; ainda falta cobrir CRUD completo da tela de endereços em navegador. |
| Fluxos financeiros de gorjeta/repasse | Adicionar E2E/API com contas fake/mockadas e unitários para regras de repasse, sem transferir dinheiro real. |

### Critério Prático de Cobertura

Não perseguir 90% apenas com E2E de navegador. Para este projeto, a meta correta é **90% de confiança dos fluxos críticos**, combinando:

- Backend API E2E para regra de negócio, concorrência, banco, autenticação, pedido, entrega, assinatura e destinos.
- Playwright para navegação e telas críticas onde layout/UX pode quebrar o uso.
- Unitários para cálculo, payload de pagamento, validações e adaptadores externos.

---

## 3. Passo a Passo: Como Rodar na sua Máquina

### Passo 3.1: Subir a Infraestrutura (O Mando de Campo)
Antes de invocar o robô do E2E, o sistema inteiro precisa estar de pé. No terminal da raiz do projeto, suba tudo:
```bash
docker-compose up -d
```
Verifique se a API, Frontend e DB estão rodando e saudáveis (acessando `http://localhost:8080`).

### Passo 3.2: Rodar os Testes Unitários (sem tela)
Os testes unitários moram na pasta `frontend/src/tests/` ou espalhados junto aos componentes `*.test.tsx`.
Para verificar lógicas de PIX e taxas, rode pelo próprio terminal do *Host* (sua máquina, não precisa entrar no Docker pra rodar o Node):
```bash
cd frontend
npm run test:unit
```

### Passo 3.3: Rodar os Testes E2E (Playwright)
O Playwright irá bater no seu Docker exposto na porta `:8080`.
Para rodar silenciosamente:
```bash
cd frontend
npm run test:e2e
```

Para rodar só um arquivo de teste:
```bash
cd frontend
npm run test:e2e -- admin-queue-ux.spec.ts
```

Para rodar todos os E2E só no projeto `Mobile Chrome`:
```bash
cd frontend
npm run test:e2e:chrome
```

Para combinar arquivo específico e projeto, use `npx` direto para evitar ambiguidade do `npm`:
```bash
cd frontend
npx playwright test admin-queue-ux.spec.ts --project "Mobile Chrome"
```

Projetos disponíveis hoje:
- `Mobile Chrome`
- `Mobile Safari`

### Passo 3.4: Ver o robô abrindo o navegador
Para rodar com o navegador visível, parecido com Selenium:
```bash
cd frontend
npm run test:e2e:headed -- admin-queue-ux.spec.ts --project "Mobile Chrome"
```

Para abrir o Playwright UI, que permite selecionar o teste e executar visualmente:
```bash
cd frontend
npm run test:e2e:ui
```

Para debugar passo a passo com Inspector:
```bash
cd frontend
npm run test:e2e:debug -- admin-queue-ux.spec.ts --project "Mobile Chrome"
```

No modo debug, clique em `Resume` no Inspector para avançar a execução. Use esse modo quando quiser ver exatamente onde o robô clicou.

### Passo 3.5: Gerar prints, vídeos e traces
Quando precisar evidência visual para revisar UI/UX, use o config dedicado `frontend/playwright.artifacts.config.ts`.

Rodar um teste com screenshot, vídeo e trace:
```bash
cd frontend
npx playwright test admin-queue-ux.spec.ts --config playwright.artifacts.config.ts --project "Mobile Chrome"
```

Rodar todos os E2E com artefatos:
```bash
cd frontend
npm run test:e2e:artifacts
```

Rodar todos os E2E com artefatos apenas no Mobile Chrome:
```bash
cd frontend
npm run test:e2e:artifacts:chrome
```

Abrir o relatório HTML depois da execução:
```bash
cd frontend
npm run test:e2e:report
```

Onde encontrar os arquivos:
- `frontend/playwright-report/`: relatório HTML aberto pelo `show-report`.
- `frontend/test-results-artifacts/`: evidências geradas com o config de artefatos.
- `test-finished-1.png`: print final do teste.
- `video.webm`: gravação do teste.
- `trace.zip`: replay completo da execução, com snapshots, ações e rede.

Para abrir um trace diretamente:
```bash
cd frontend
npx playwright show-trace test-results-artifacts/<pasta-do-teste>/trace.zip
```

Importante:
- Não commitar `playwright-report/`, `test-results/` ou `test-results-artifacts/`.
- Prints/vídeos são evidências locais para análise e debug, não fazem parte do código.
- Se o teste precisa validar regra de negócio, prefira backend E2E ou unitário. Use Playwright para tela, navegação, layout e fluxo do usuário.

---

## 4. Como Criar Novos Testes?

A arquitetura de Suítes do Hub obedece a separação por Domínio:
- `tests/e2e/auth.spec.ts` (Login e Biometria)
- `tests/e2e/checkout.spec.ts` (Carrinho e Fechamento)
- `tests/unit/pixPayload.test.ts` (Validadores cegos)

### Dicas de Ouro para Devs Sêniors:
1. **Banco Limpo:** Um teste E2E bom limpa suas sujeiras depois de acabar. Evite criar "Lojas Teste" a cada *loop* e largar lixo no Mongo/Postgres local. 
2. **Não use Hard Waits (Sleeps):** O frontend do EdEspeto usa animações `framer-motion` pesadas. Não mande o Playwright "Esperar 3 segundos". Use os seletores automáticos `await page.waitForSelector('.minha-sacola-carregada')` para lidar com atrasos do Docker/Backend.
3. **Biometria:** Lembre-se de dar um `mock` (fingir o resultado) da API `/face-worker` quando testar login no E2E local, pois o Face-Worker necessita de câmera e uploads.

---

*Fim do Guia. Qualquer dúvida adicional ou quebra de pipeline, cheque os logs do Docker via `docker-compose logs -f api`.*
