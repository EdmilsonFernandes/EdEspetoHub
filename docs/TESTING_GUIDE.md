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
npm run test
```

### Passo 3.3: Rodar os Testes E2E (Playwright)
O Playwright irá bater no seu Docker exposto na porta `:8080`.
Para rodar silenciosamente:
```bash
cd frontend
npx playwright test
```

Para rodar **Vendo a Tela do Robô** (Visual Debugging - Muito útil para entender onde o teste quebrou na UI):
```bash
cd frontend
npx playwright test --ui
```

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
