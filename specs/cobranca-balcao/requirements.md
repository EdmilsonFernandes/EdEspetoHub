# Requisitos — cobranca-balcao

> Fase 1 do SDD Janocaminho · Gate G1 · Aprovação: Edmilson (PO)
> Status: **Aprovado — G1 fechado em 2026-08-28** | Aceito em: 2026-08-28
> Autor: agente (Claude) com input do Edmilson · Data: 2026-08-28

## Histórico de alterações

| Data | Alteração | Autor |
|---|---|---|
| 2026-08-28 | Emissão inicial | agente |
| 2026-08-28 | Ajustes do PO: expiração = 5 min (REQ-5/11); cobrança por ADMIN, LOJISTA e OPERATOR (REQ-1/19 — respostas unificam "admin e operador" + "lojista e operator"); acréscimo confirmado nas duas direções (REQ-15) | PO via agente |
| 2026-08-28 | Pagamento misto: bloqueado por hora (PO) | PO via agente |
| 2026-08-28 | **REQ-28 adicionado** (direção do PO após teste local): pedido criado por lojista/operador no balcão/mesa NÃO pergunta forma de pagamento no checkout — decide-se no fechamento (Cobrar). Fluxo do cliente online permanece intacto. Também: botão de método indisponível no sheet passa a explicar o motivo ao toque (lição do teste — loja sem MP conectada ficava muda). Idea de backlog registrada: ação rápida "play" no card para pedidos presenciais. | PO via agente |

## 1. Objetivo e valor

Hoje o pagamento integrado só acontece no checkout do cliente (Pix). Quando o cliente
paga **presencialmente** — retirada no balcão, mesa, entrega na mão — o lojista resolve
fora do sistema (dinheiro solto, Pix manual), sem rastro e sem conciliação. Esta feature
cria o **momento do pagamento no balcão**: uma ação "Cobrar" na fila do lojista que
oferece **Pix (Mercado Pago da loja)**, **maquininha Point** e **dinheiro**, com o valor
do pedido (ajustável para desconto). Fecha o buraco operacional, gera rastro de caixa e
usa a mesma conta conectada que a loja já tem.

**Invariante central (decisão do PO):** a jornada do cliente que faz o pedido e acompanha
o rastreio **não muda** — mesmos status (atender → preparação → pronto → entrega),
pagamento é um estado paralelo do pedido, não uma etapa da fila.

## 2. Personas e usuários

| Persona | Descrição | Necessidade principal |
|---|---|---|
| lojista (ADMIN da loja) | dono/gerente que opera a fila | receber o pagamento presencial integrado, dar desconto |
| operador (OPERATOR) | funcionário que opera a fila no dia a dia | cobrar sem pedir login do dono |
| cliente | pessoa que fez o pedido e acompanha o rastreio | ver "pagamento confirmado" sem aprender nada novo |
| Edmilson (plataforma) | dono do hub | dinheiro fluir direto loja↔cliente (comissão zero), rastro de caça |

## 3. Escopo

**Incluído:**
- Ação "Cobrar" no pedido da fila (lojista), com sheet de escolha: Pix · Maquininha · Dinheiro
- Pix gerado na hora pela conta Mercado Pago **conectada da loja** (mesma integração do checkout)
- Cobrança na maquininha Point (terminais da loja em modo integrado/PDV)
- Registro de recebimento em dinheiro (manual, auditável)
- Valor padrão = total em aberto do pedido, **ajustável** (desconto ou acréscimo) com registro
- Cancelamento e expiração de cobrança; proteção contra dupla cobrança
- Reflexo do pagamento na fila e no rastreio do cliente

**Excluído (fora de escopo):**
- Pagamento **misto** (duas formas no mesmo pedido) — bloqueado **por hora** (decisão do PO 2026-08-28; um método por pedido, reavaliável no futuro)
- Cobrança avulsa sem pedido
- Auto-cobrança (disparar sem ação do lojista)
- Troco calculado no dinheiro (v1 registra o valor recebido, sem calculadora de troco)
- Alteração da jornada/timeline de status do pedido do cliente
- Cartão digitado online (somente presencial: terminal ou Pix)

**Premissas e restrições:**
- Público real é mobile/WebView Android (APK Capacitor) — sheet precisa funcionar lá
- Valores com 2 casas decimais (exigência do Mercado Pago)
- A maquininha precisa estar vinculada à conta MP da loja e em modo PDV (hardware do lojista)
- Loja sem conta conectada: Pix e Maquininha ficam indisponíveis; Dinheiro funciona
- Cobranças sempre com a conta **da loja** (token OAuth conectado), nunca com token da plataforma

**Dependências:**
- Endpoint de listagem de terminais (já em produção — commit 49a54b68)
- Permissões "In-store Orders/Terminal List" na aplicação MP **Ja no Caminho Tecnologias**
- Lojista reconectado o MP após a adição dos escopos (escopo não retroage)
- Notificações do Mercado Pago (webhook de order/pagamento) já configuradas no app MP
- Comportamento atual do rastreio do cliente (OrderTracking) intocado

---

## 4. Histórias e critérios de aceite (EARS)

### História 1: Cobrar via Pix no balcão

**Como** lojista, **quero** gerar um Pix da loja na hora do recebimento, **para** o cliente
pagar por QR sem eu sair do sistema.

- **REQ-1** — QUANDO um usuário ADMIN, LOJISTA ou OPERATOR aciona "Cobrar" em um pedido
  com pagamento em aberto O SISTEMA DEVE abrir a cobrança oferecendo Pix, Maquininha e
  Dinheiro como formas de recebimento.
- **REQ-2** — QUANDO a forma escolhida é Pix O SISTEMA DEVE gerar cobrança Pix pela conta
  Mercado Pago conectada da loja, com o valor da cobrança (padrão: total em aberto) e
  exibir o QR Code e o código copia-e-cola.
- **REQ-3** — QUANDO o Mercado Pago confirma o pagamento Pix O SISTEMA DEVE marcar o
  pedido como pago e refletir na fila sem exigir ação do lojista.
- **REQ-4** — QUANDO a loja não tem conta Mercado Pago conectada O SISTEMA DEVE exibir
  as opções Pix e Maquininha como indisponíveis com orientação de conexão, mantendo
  apenas Dinheiro utilizável.
- **REQ-5** — QUANDO uma cobrança Pix fica **5 minutos** sem pagamento O SISTEMA DEVE
  marcá-la expirada e permitir gerar nova cobrança (sem sobreposição de cobranças ativas
  para o mesmo pedido).

### História 2: Cobrar na maquininha Point

**Como** lojista, **quero** enviar o valor direto para a maquininha da loja, **para** o
cliente pagar no terminal sem eu digitar nada.

- **REQ-6** — QUANDO a forma escolhida é Maquininha O SISTEMA DEVE enviar a cobrança para
  um terminal Point da loja em modo integrado e exibir o estado "aguardando pagamento no
  terminal".
- **REQ-7** — QUANDO a loja tem mais de um terminal disponível O SISTEMA DEVE permitir
  escolher qual receberá a cobrança; QUANDO tem apenas um O SISTEMA DEVE usá-lo
  diretamente.
- **REQ-8** — QUANDO o pagamento é concluído no terminal O SISTEMA DEVE marcar o pedido
  como pago a partir da confirmação automática do Mercado Pago, sem ação do lojista.
- **REQ-9** — QUANDO não há terminal em modo integrado disponível O SISTEMA DEVE informar
  claramente (nenhuma maquininha / maquininha fora do modo integrado) e não criar
  cobrança.
- **REQ-10** — QUANDO o Mercado Pago recusar a operação de terminal por permissão
  insuficiente da conta conectada O SISTEMA DEVE orientar a reconexão do Mercado Pago da
  loja.
- **REQ-11** — QUANDO uma cobrança de terminal fica **5 minutos** sem pagamento, ou é
  rejeitada, O SISTEMA DEVE marcá-la encerrada e permitir nova tentativa.

### História 3: Registrar dinheiro

**Como** lojista, **quero** registrar que recebi em dinheiro, **para** o pedido constar
como pago com rastro de caixa.

- **REQ-12** — QUANDO a forma escolhida é Dinheiro O SISTEMA DEVE permitir informar o
  valor recebido e marcar o pedido como pago imediatamente após a confirmação do lojista.
- **REQ-13** — QUANDO um recebimento em dinheiro é registrado O SISTEMA DEVE registrar
  valor, data/hora e o usuário que registrou (trilha de auditoria).

### História 4: Ajustar o valor (desconto/acréscimo)

**Como** lojista, **quero** ajustar o valor antes de cobrar, **para** dar desconto ou
acrescentar algo sem refazer o pedido.

- **REQ-14** — QUANDO a cobrança é aberta O SISTEMA DEVE sugerir como valor padrão o
  total em aberto do pedido.
- **REQ-15** — QUANDO o lojista ajusta o valor O SISTEMA DEVE cobrar o valor ajustado e
  registrar valor original, valor cobrado e autor do ajuste no histórico do pedido.
- **REQ-16** — QUANDO o valor informado é inválido (vazio, menor ou igual a zero, ou não
  numérico) O SISTEMA DEVE bloquear a cobrança com mensagem de correção.

### História 5: Proteções do sistema

**Como** sistema, **quero** garantir integridade das cobranças, **para** nunca cobrar
duas vezes nem perder estado.

- **REQ-17** — QUANDO o pedido já está pago O SISTEMA DEVE manter a ação "Cobrar"
  indisponível para esse pedido (não existe caminho de dupla cobrança pela interface).
- **REQ-18** — QUANDO o lojista cancela uma cobrança em andamento O SISTEMA DEVE encerrar
  a cobrança pendente no Mercado Pago e liberar o pedido para nova cobrança.
- **REQ-19** — QUANDO um usuário sem papel ADMIN, LOJISTA ou OPERATOR tenta cobrar O
  SISTEMA DEVE recusar com erro de permissão.
- **REQ-20** — QUANDO o mesmo pedido tem uma cobrança ativa (Pix ou terminal) O SISTEMA
  DEVE rejeitar a criação de uma segunda cobrança ativa da mesma forma simultânea
  (reativando/renovando a existente quando aplicável).
- **REQ-21** — QUANDO a confirmação do Mercado Pago não chega (notificação perdida) O
  SISTEMA DEVE consultar o status da cobrança ao reabri-la e sincronizar o estado real.
- **REQ-22** — QUANDO um pedido é cancelado com cobrança pendente O SISTEMA DEVE encerrar
  a cobrança pendente no Mercado Pago.
- **REQ-23** — QUANDO o Mercado Pago está indisponível O SISTEMA DEVE exibir erro claro e
  permitir nova tentativa sem criar cobrança duplicada.

### História 6: Cliente sem mudança de jornada (invariante)

**Como** cliente, **quero** ver meu pagamento confirmado no rastreio, **para** saber que
está tudo certo sem aprender nada novo.

- **REQ-24** — QUANDO um pedido pago no balcão é confirmado O SISTEMA DEVE exibir o
  pagamento confirmado no rastreio do cliente **sem** adicionar etapas, status ou telas
  novas à jornada de acompanhamento existente.
- **REQ-25** — QUANDO o cliente já pagou no checkout O SISTEMA DEVE manter o
  comportamento atual de rastreio inalterado.

### História 7: Pedido criado por lojista/operador no balcão (v1.1 — a implementar)

**Como** lojista/operador, **quero** criar o pedido de mesa/balcão **sem escolher forma
de pagamento no checkout**, **para** decidir na hora de fechar a conta (Pix, cartão na
maquininha ou dinheiro) — que é quando o cliente realmente paga.

- **REQ-28** — QUANDO um usuário ADMIN, LOJISTA ou OPERATOR da loja cria um pedido pelo
  checkout O SISTEMA DEVE omitir a etapa de forma de pagamento, criar o pedido com
  pagamento pendente e sem método definido; a forma é escolhida depois em "Cobrar".
- **REQ-29** — QUANDO um pedido sem método definido aparece na fila e no rastreio O
  SISTEMA DEVE exibir "pagar no balcão/fechamento" de forma clara, sem erro ou campo
  vazio.
- **REQ-30** (invariante reafirmada) — QUANDO o pedido é criado por cliente online
  (visitante ou conta cliente) O SISTEMA DEVE manter a etapa de pagamento do checkout
  exatamente como hoje — nenhuma mudança perceptível.

---

## 5. RNF

| # | Requisito | Alvo |
|---|---|---|
| RNF-1 | Latência da confirmação (webhook → fila/rastreio pagar de "pendente" para "pago") | ≤ 10 s p95 `<A DEFINIR — confirmar>` |
| RNF-2 | Abertura da cobrança (toque → sheet pronto) | ≤ 1 s p95 em mobile WebView |
| RNF-3 | Acessibilidade do sheet: contraste WCAG 2.1 AA, alvos de toque ≥ 44px, foco navegável | WCAG 2.1 AA |
| RNF-4 | Compatibilidade: Android WebView (APK Capacitor) e web — sem regressão de layout mobile | Docker local + APK |
| RNF-5 | Offline/instável: WebView sem rede durante cobrança → erro claro, pedido sem estado corrompido; sem fila offline nesta feature | comportamento verificável |
| RNF-6 | Idempotência: reenvio de cobrança/webhook não duplica pagamento nem cobrança ativa | teste automatizado |
| RNF-7 | Observabilidade: eventos de cobrança logados com ids de pedido/pagamento; **sem** token, PII ou credencial em log | revisão de diff + teste |

## 6. Triagem de segurança (shift-left — checklist da referência §5)

| Questão | Resposta | Nota |
|---|---|---|
| Trata dados pessoais/sensíveis? | **Parcial** | Não coleta dado novo. Envia ao MP: valor + referência interna + descrição. **REQ extra abaixo** garante minimização. |
| Autenticação/autorização envolvidas? | **Sim** | Cobrança por ADMIN/OPERATOR (REQ-19); BFF sempre na frente do backend. |
| APIs/integrações externas? | **Sim** | Mercado Pago (Pix, Point, webhooks) com token OAuth da loja. Dinheiro = registro manual auditável (REQ-13). Never-trust-o-cliente: valor original sempre recalculado pelo servidor; ajuste é ato de staff autenticado (REQ-15). |
| Logs/criptografia/infra? | **Sim (já existente)** | Tokens MP já cifrados em repouso (StorePaymentAccount). Webhook precisa validar assinatura/origem. |
| Dependências novas? | Não | Nenhuma lib nova prevista. |

- **REQ-26** (minimização LGPD) — QUANDO uma cobrança é enviada ao Mercado Pago O SISTEMA
  DEVE restringir a descrição a dados não pessoais (ex.: número do pedido e nome da
  loja), sem nome/telefone/endereço do cliente.
- **REQ-27** (integridade do webhook) — QUANDO uma notificação de pagamento chega O
  SISTEMA DEVE validar sua autenticidade antes de marcar qualquer pedido como pago.

**Registro:** impacto de segurança **existente** (auth + integração financeira) →
requisitos de segurança com `sdd-security-req` (5 campos) a registrar na fase de design
(G2), vinculado a esta spec.

## 7. Plano de validação (mapa REQ → validação)

| REQ | Validação |
|---|---|
| REQ-1, 4, 9, 10, 14, 17, 19 | Teste automatizado backend (permissões/estados) + manual Docker (sheet) |
| REQ-2, 3, 5 | Teste automatizado backend (criação/expiração Pix) + confirmação por webhook em Docker |
| REQ-6, 7, 8, 11 | Backend automatizado com respostas simuladas do MP + **validação real com Point Pro 3** (chegada do hardware) registrada em `rastreabilidade.md` |
| REQ-12, 13, 15, 16, 26 | Teste automatizado backend (serviço + auditoria) |
| REQ-18, 20, 21, 22, 23, 27 | Teste automatizado backend (idempotência/cancelamento/webhook) |
| REQ-24, 25 | QA visual (playwright-visual-qa) no rastreio + regressão da jornada atual |
| RNF-1..7 | RNF-1 `<A DEFINIR>` · RNF-2/3/4 manual APK + Docker · RNF-5/6/7 testes automatizados |

## 8. DoR (Definition of Ready)

```
[x] Valor de negócio descrito (§1)
[x] Histórias no formato persona/ação/benefício (§4)
[x] Escopo incluído E excluído explícitos (§3)
[x] Critérios EARS com caminhos felizes, erros e bordas (REQ-1..27)
[x] RNF mensuráveis — 1 alvo a confirmar (RNF-1)
[ ] Mockup/protótipo do sheet (UI) — a fazer na fase de design com skills de UX
[x] Dependências identificadas (§3) — gates: backend + frontend + BFF; sem migration prevista
[x] Impacto de segurança avaliado (§6) — sdd-security-req agendado p/ G2
[x] Plano de validação esboçado (§7)
```

## 9. Perguntas para o PO — status

1. **RNF-1** (latência ≤ 10 s p95): respondida como ok em 2026-08-28 — silêncio = aceito no gate.
2. **Expiração**: ✅ 5 minutos (aplicado em REQ-5/REQ-11).
3. **Papéis**: ✅ ADMIN, LOJISTA e OPERATOR cobram (aplicado em REQ-1/REQ-19).
4. **Acréscimo**: ✅ permitido nas duas direções (REQ-15 já cobria; confirmado).
5. **Pagamento misto**: ✅ bloqueado por hora — um método por pedido (PO 2026-08-28).

---

**Status: Aprovado — gate G1 fechado em 2026-08-28 (Edmilson, via conversa).**
