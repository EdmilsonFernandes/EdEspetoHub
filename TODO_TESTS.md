# 📋 TODO: Próximos Passos (Suítes de Teste)

Este documento foi criado para não esquecermos de onde paramos na saga de implantação da cultura de E2E e TDD no Hub.

## O Que Já Foi Feito (Infraestrutura Pronta ✅)
- Instalação e configuração de ambiente Base (`Playwright` rodando Móbile e `Vitest` rodando JSDom).
- Guia de boas práticas criado (`docs/TESTING_GUIDE.md`).
- Script de Unit criado testando Regras Financeiras (`frontend/src/tests/unit/pixPayload.test.ts`).
- Estrutura base de Login injetada no Playwright.

---

## 🚀 Próximos Passos a Executar (Quando For Retomar)

### 1. Teste de Fluxo Completo de Sacola (E2E)
- [ ] Construir no `tests/e2e/checkout.spec.ts` a ação do robô:
  1. Acessar `http://localhost:8080/`.
  2. Simular toque num estabelecimento aberto.
  3. Adicionar "Espeto de Carne" + Manipulador (Com Pão de Alho).
  4. Clicar no botão Inferior Frontal ("Ver minha sacola").
  5. Validar o Subtotal na UI.
  6. Fechar pedido (Retirada) e ler sucesso para confirmar gravação no DB/API.

### 2. Mock de Biometria / Roles
- [ ] No arquivo `auth.spec.ts`, ensinar o Playwright a fingir que a Câmera escaneou uma face (interceptando a API `face-worker`) para o robô passar do login sem estagnar a simulação de tela.

### 3. CI/CD Pipeline
- [ ] Após finalizar testes (e rodar eles locais 1x para sucesso de prova visual), criar o arquivo `.github/workflows/playwright.yml` para que toda vez que tiver um "Git Push", a nuvem rode esses testes sozinha e bloqueie se der erro (impedindo que bugs vão parar no ar!).
