# Manual do Usuario - Ja no Caminho

Manual pratico para operar o sistema no dia a dia, sem depender de suporte tecnico.

## 1) O que e o Ja no Caminho

O Ja no Caminho e uma plataforma de pedidos para varios segmentos (restaurante, adega, farmacia, mercado, lanches e comercio local), com:

- Vitrine publica da loja
- Painel administrativo
- Central de pedidos (operacao)
- Area de entregadores
- Assinatura e pagamentos
- Avaliacoes, gorjetas e repasses

## 2) Perfis de acesso

- Cliente final: faz pedido e acompanha status
- Admin da loja: configura loja, produtos, pedidos, pagamentos e equipe
- Entregador: recebe, aceita e finaliza entregas
- Super admin: gestao global da plataforma

## 3) Acesso rapido por rota

- Site principal: `https://www.janocaminho.com.br`
- Criar loja: `https://www.janocaminho.com.br/create`
- Login admin loja: `https://www.janocaminho.com.br/admin`
- Login entregador: `https://www.janocaminho.com.br/motoboy/login`
- Super admin: `https://www.janocaminho.com.br/superadmin`
- Portfolio: `https://www.janocaminho.com.br/portfolio`

## 4) Fluxo inicial (novo lojista)

1. Acessar `Criar loja`.
2. Preencher dados pessoais, endereco e dados da loja.
3. Definir segmento, slug, contato e identidade visual.
4. Finalizar cadastro e entrar no painel admin.
5. Configurar produtos, horarios e tipos de pedido.
6. Publicar link da loja e iniciar operacao.

## 5) Operacao do Admin da Loja

### 5.1 Resumo

Use o resumo para conferir:

- Receita total/mes/periodo
- Pedidos e ticket medio
- Status de assinatura
- Link da loja e QR code para divulgacao
- Indicadores de avaliacao e gorjetas (quando aplicavel)

### 5.2 Central de pedidos (operacao)

Status principais:

- Pendentes: pedido novo aguardando atendimento
- Em atendimento: pedido em preparo/processamento
- Prontos: pedido finalizado aguardando retirada/entrega
- Em rota: pedido aceito por entregador e em entrega
- Finalizados hoje: concluido no dia

Boas praticas:

- Sempre iniciar atendimento assim que entrar pedido novo
- Marcar pronto somente quando realmente finalizado
- Se for entrega, acompanhar transicao ate entregue

### 5.3 Produtos

No menu Produtos:

- Cadastrar nome, preco, categoria, foto e descricao
- Definir promocao do dia (quando aplicavel)
- Configurar adicionais (ex.: bacon, ovo, etc.)
- Definir dias de exibicao e disponibilidade

Dica: padronize fotos e nomes curtos para melhorar conversao.

### 5.4 Configuracoes da loja

Campos principais:

- Nome, descricao, logo e banner
- Cor principal da marca
- Endereco e contato
- Horario de funcionamento
- Tipo de pedido (entrega, retirada, mesa)
- Chave Pix da loja

Regra visual do painel:

- Se houver banner da loja, o header usa o banner
- Se nao houver banner, o header usa a cor principal

### 5.5 Entregadores

No menu Entregadores:

- Copiar link de cadastro para novos entregadores
- Aprovar/reprovar solicitacoes
- Ver entregadores vinculados
- Conferir documentos e status
- Acompanhar repasse de gorjetas

### 5.6 Pagamentos e assinatura

No menu Pagamentos:

- Ver plano atual e expiracao
- Renovar ou trocar assinatura
- Ver historico de tentativas e pagamentos
- Pagar por Pix/cartao/boleto (conforme disponibilidade)

Importante:

- Trial libera recursos temporariamente
- Pagamento `PENDING` nao confirma plano
- Somente status pago ativa/renova plano

## 6) Planos (visao funcional)

### Basic

- Site/vitrine online
- Pedidos e operacao base
- Retirada e mesa (conforme configuracao da loja)
- Sem recursos avancados de entrega/gorjeta

### Pro

- Tudo do Basic
- Gestao de entregadores
- Fluxo completo de entrega
- Gorjetas e repasses
- Recursos avancados de operacao

### Trial

- Periodo inicial para teste
- Regras comerciais definidas pela plataforma

## 7) Area do Entregador

### 7.1 Perfil

- Atualizar dados pessoais e veiculo
- Enviar documentos
- Definir chave Pix (quando habilitado)

### 7.2 Fila

- Ver pedidos disponiveis
- Aceitar entrega
- Atualizar status da rota
- Finalizar entrega

### 7.3 Ganhos

- Total do dia
- Frete dos ultimos 30 dias
- Gorjetas recebidas
- Repasses pendentes e concluidos
- Historico de entregas

## 8) Avaliacoes, gorjetas e repasses

### 8.1 Cliente

Ao concluir pedido, cliente pode:

- Avaliar loja
- Avaliar entrega (quando houver entregador)
- Pagar gorjeta via Pix

### 8.2 Loja

Pode acompanhar:

- Nota media
- Comentarios e tags
- Gorjetas pendentes e repassadas

### 8.3 Repasses para entregador

No admin:

- Ver pendencias por entregador
- Copiar chave Pix do entregador
- Marcar repasse como pago
- Anexar comprovante (quando aplicavel)

## 9) Seguranca no acompanhamento de pedido

A avaliacao de pedido e protegida por token do dispositivo que criou o pedido.

Na pratica:

- Quem abre o link no mesmo dispositivo pode avaliar normalmente
- Em navegador anonimo ou outro aparelho, pode aparecer bloqueio de avaliacao
- Isso evita avaliacao indevida por terceiros com link compartilhado

## 10) Fluxo recomendado para operacao diaria

1. Abrir painel admin e verificar assinatura ativa.
2. Conferir horarios e disponibilidade da loja.
3. Validar produtos em destaque e estoque operacional.
4. Monitorar Central de pedidos continuamente.
5. Mover pedido pelos status corretos sem pular etapas.
6. Em entrega, acompanhar fila de motoboys e status de rota.
7. Fechar dia com conferencia de pedidos, receita e repasses.

## 11) Erros comuns e como resolver

### Pedido nao aparece na fila

- Verifique se cliente concluiu checkout
- Atualize tela da Central de pedidos
- Confira se loja esta aberta

### Banner nao aparece no painel

- Salvar configuracao da loja novamente
- Verificar se upload concluiu
- Se removido, painel volta para cor principal

### Avaliacao bloqueada

- Abrir o link no mesmo dispositivo em que pedido foi criado
- Evitar modo anonimo para avaliar pedido existente

### Pagamento de assinatura nao refletiu

- Conferir status real no historico (`PAID`, `PENDING`, `FAILED`)
- `PENDING` nao ativa recurso
- Validar webhooks e tentar atualizar apos confirmacao do provedor

## 12) Checklist de publicacao de uma nova loja

- Nome, logo, banner e cores ok
- Segmento, cidade e UF preenchidos
- Horarios configurados
- Produtos publicados com foto e preco
- Pix configurado
- Tipos de pedido conferidos
- Link da vitrine testado em celular
- Fluxo completo de pedido testado (inicio ao fim)

## 13) Contato e suporte interno

Se precisar suporte tecnico:

- Registrar rota/tela com problema
- Enviar print e horario do erro
- Informar slug da loja
- Informar se ocorreu em mobile, desktop ou ambos

---

Manual vivo: atualize este arquivo a cada nova funcionalidade relevante para manter operacao e treinamento alinhados.

