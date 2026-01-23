# QA Checklist - Chama no Espeto

Checklist formal para validar fluxos principais em desktop e mobile.

## 1) Cadastro e assinatura

- **REG-001 Cadastro com trial**
  - Passo: criar loja com plano trial.
  - Esperado: sem cobrança, status ativo por 7 dias.
- **REG-002 Expiração do trial**
  - Passo: simular expiração.
  - Esperado: loja inativa + redireciona para renovação.
- **REG-003 Renovação**
  - Passo: acessar `/admin/renewal`.
  - Esperado: só planos pagos disponíveis; gera novo pagamento.

## 2) Pagamentos

- **PAY-001 Pix**
  - Passo: gerar pagamento via Pix.
  - Esperado: QR + copia/cola + status pendente.
- **PAY-002 Cartão**
  - Passo: gerar pagamento via cartão.
  - Esperado: link de pagamento abre corretamente.
- **PAY-003 Boleto**
  - Passo: gerar pagamento via boleto.
  - Esperado: link de boleto abre corretamente.
- **PAY-004 Webhook aprovado**
  - Passo: aprovar pagamento.
  - Esperado: assinatura ativa + loja aberta + e-mail enviado.
- **PAY-005 Expirado/failed**
  - Passo: deixar expirar.
  - Esperado: renovação gera novo pagamento (não reutiliza link).

## 3) Admin

- **ADM-001 Login ativo**
  - Passo: login.
  - Esperado: entra no dashboard.
- **ADM-002 Assinatura expirada**
  - Passo: login com assinatura expirada.
  - Esperado: redireciona para `/admin/renewal`.
- **ADM-003 Sessão expirada**
  - Passo: limpar token.
  - Esperado: volta ao login e limpa `adminSession`.

## 4) Super admin

- **SADM-001 Super admin**
  - Passo: login com `chamanoespetoadmin`.
  - Esperado: acesso ao painel superadmin.

## 5) Cardápio

- **MENU-001 Carrega loja**
  - Passo: abrir loja.
  - Esperado: nome, logo, cores e produtos exibidos.
- **MENU-002 Mobile (Info Sheet)**
  - Passo: abrir no celular.
  - Esperado: info sheet com endereço, mapa, WhatsApp e Instagram.
- **MENU-003 Adição rápida**
  - Passo: clicar `+` em espeto.
  - Esperado: adiciona com defaults (ao ponto, sem varinha).
- **MENU-004 Promoção**
  - Passo: item com promo ativo.
  - Esperado: preço original riscado + promocional.

## 6) Checkout / pedido

- **CART-001 Mesa**
  - Passo: escolher Mesa.
  - Esperado: telefone opcional; mesa obrigatória.
- **CART-002 Entrega**
  - Passo: escolher Entrega.
  - Esperado: telefone e endereço obrigatórios.
- **CART-003 Pagamento**
  - Passo: trocar Pix/Débito/Crédito.
  - Esperado: card selecionado com destaque premium.
- **ORD-001 Pedido admin**
  - Passo: admin faz pedido.
  - Esperado: não abre WhatsApp, volta para cardápio.

## 7) Acompanhar pedido

- **TRK-001 Página pública**
  - Passo: abrir `/pedido/:id`.
  - Esperado: status, timeline, itens e pagamento visíveis.
- **TRK-002 Voltar (admin)**
  - Passo: clicar voltar como admin.
  - Esperado: abre fila do churrasqueiro.
- **TRK-003 Voltar (público)**
  - Passo: clicar voltar como público.
  - Esperado: volta para cardápio da loja.
- **TRK-004 Último pedido salvo**
  - Passo: pedido público e fechar navegador.
  - Esperado: botão "Acompanhar agora" aparece na loja.

## 8) Fila do churrasqueiro

- **GRL-001 Fila**
  - Passo: novo pedido.
  - Esperado: aparece na fila + som (se habilitado).
- **GRL-002 Fluxo de preparo**
  - Passo: "Iniciar preparo" -> "Marcar pronto".
  - Esperado: status e timeline atualizam.
- **GRL-003 Mesa destacada**
  - Passo: pedido de mesa.
  - Esperado: badge "Mesa X" visível.
- **GRL-004 Finalizados hoje**
  - Passo: marcar pronto.
  - Esperado: pedido aparece na aba "Finalizados hoje".
- **GRL-005 Remover itens**
  - Passo: remover todos os itens.
  - Esperado: pedido cancelado e removido da fila.

## 9) Produtos

- **PRD-001 CRUD**
  - Passo: criar/editar/excluir.
  - Esperado: lista atualiza sem erro.
- **PRD-002 Upload imagem**
  - Passo: upload > 3MB.
  - Esperado: bloqueia com mensagem.
