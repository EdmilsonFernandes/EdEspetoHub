# QA Checklist - Chama no Espeto

Checklist formal para validar fluxos principais (cardapio, admin, pagamentos e acompanhamento).

## Cadastro e assinatura

**REG-001 Cadastro com trial**
- Passo: criar loja com plano trial.
- Esperado: sem cobranca, status ativo por 7 dias.

**REG-002 Expiracao do trial**
- Passo: simular expiracao.
- Esperado: loja inativa + redireciona para renovacao.

## Pagamentos

**PAY-001 Pagamento Pix**
- Passo: criar plano pago com Pix.
- Esperado: QR + copia/cola + status pendente.

**PAY-002 Pagamento cartao**
- Passo: criar plano pago com cartao.
- Esperado: link de pagamento abre corretamente.

**PAY-003 Pagamento boleto**
- Passo: criar plano pago com boleto.
- Esperado: link de boleto abre corretamente.

**PAY-004 Aprovacao via webhook**
- Passo: aprovar pagamento.
- Esperado: assinatura ativa + loja aberta + e-mail enviado.

**PAY-005 Pagamento expirado/failed**
- Passo: deixar expirar.
- Esperado: renovar gera novo pagamento (nao reutiliza link).

## Admin

**ADM-001 Login admin ativo**
- Passo: login.
- Esperado: entra no dashboard.

**ADM-002 Login admin expirado**
- Passo: login com assinatura expirada.
- Esperado: redireciona para `/admin/renewal`.

**ADM-003 Sessao expirada**
- Passo: limpar token.
- Esperado: volta ao login e limpa `adminSession`.

## Super admin

**SADM-001 Super admin**
- Passo: login com `chamanoespetoadmin`.
- Esperado: acesso ao painel superadmin.

## Cardapio

**MENU-001 Cardapio carrega**
- Passo: abrir loja.
- Esperado: nome, logo, cores e produtos exibidos.

**MENU-002 Cardapio mobile (Info Sheet)**
- Passo: abrir mobile.
- Esperado: info sheet com endereco, mapa, WhatsApp e Instagram.

**MENU-003 Adicao rapida espeto**
- Passo: clicar `+` em espeto.
- Esperado: adiciona com defaults (ao ponto, sem varinha).

## Checkout / pedido

**CART-001 Tipo Mesa**
- Passo: escolher Mesa.
- Esperado: telefone opcional; mesa obrigatoria.

**CART-002 Entrega**
- Passo: escolher Entrega.
- Esperado: telefone e endereco obrigatorios.

**CART-003 Pagamento**
- Passo: trocar Pix/Debito/Credito.
- Esperado: card selecionado com destaque premium.

**ORD-001 Pedido admin**
- Passo: admin faz pedido.
- Esperado: nao abre WhatsApp, volta para cardapio.

## Acompanhar pedido

**TRK-001 Acompanhar pedido**
- Passo: abrir `/pedido/:id`.
- Esperado: status, timeline, itens e pagamento visiveis.

**TRK-002 Voltar (admin)**
- Passo: clicar voltar como admin.
- Esperado: abre fila do churrasqueiro.

**TRK-003 Voltar (publico)**
- Passo: clicar voltar como publico.
- Esperado: volta para cardapio da loja.

**TRK-004 Ultimo pedido salvo**
- Passo: pedido publico e fechar navegador.
- Esperado: botao "Acompanhar agora" aparece na loja.

## Fila do churrasqueiro

**GRL-001 Fila**
- Passo: novo pedido.
- Esperado: aparece na fila + som (se habilitado).

**GRL-002 Fluxo preparo**
- Passo: "Iniciar preparo" -> "Marcar pronto".
- Esperado: status e timeline atualizam.

**GRL-003 Mesa destacada**
- Passo: pedido de mesa.
- Esperado: badge "Mesa X" visivel.

**GRL-004 Finalizados hoje**
- Passo: marcar pronto.
- Esperado: pedido aparece na aba "Finalizados hoje".

**GRL-005 Remover itens**
- Passo: remover todos os itens.
- Esperado: pedido cancelado e removido da fila.

## Produtos

**PRD-001 CRUD produtos**
- Passo: criar/editar/excluir.
- Esperado: lista atualiza sem erro.

**PRD-002 Upload imagem**
- Passo: upload > 3MB.
- Esperado: bloqueia com mensagem.
