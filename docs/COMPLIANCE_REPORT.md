# Relatório de Compliance, UX Writing e LGPD — Já no Caminho

**Data:** 05/05/2026  
**Escopo:** Landing page, termos, fluxos de associação motoboy/loja, checkout, painéis, KYC, nomenclaturas  
**Status:** Diagnóstico completo + recomendações. Aguarda validação jurídica antes de implementação.

---

## Sumário Executivo

A plataforma "Já no Caminho" possui termos de uso com disclaimers de responsabilidade adequados na página `/terms`, porém a comunicação no restante do sistema (landing page, fluxos operacionais, checkout, painéis) **não reflete consistentemente** o posicionamento correto de SaaS/ferramenta tecnológica.

### Principais riscos identificados:

| # | Risco | Severidade | Local |
|---|-------|-----------|-------|
| 1 | Landing page usa linguagem que posiciona a plataforma como gestora de entregas/entregadores | Alta | `LandingPage.tsx` |
| 2 | Nenhum disclaimer no checkout sobre responsabilidade da loja | Alta | `CartView.tsx`, `StorePage.tsx` |
| 3 | Aprovação de motoboy pela loja sem checkbox de responsabilidade | Alta | `AdminMotoboys.tsx` |
| 4 | Solicitação de vínculo pelo motoboy sem aceite específico | Alta | `MotoboyProfile.tsx` |
| 5 | KYC apresentado como "validação feita pela plataforma" sem disclaimer de caráter preliminar | Média | `AdminMotoboys.tsx` |
| 6 | Sem consentimento LGPD para compartilhamento de dados motoboy→loja | Alta | `MotoboyProfile.tsx` |
| 7 | Termos do CreateStore simplificados — não cobrem delivery/motoboy | Média | `CreateStore.tsx` |
| 8 | Sem disclaimer no OrderTracking sobre quem entrega | Média | `OrderTracking.tsx` |
| 9 | Sem auditoria estruturada de aceites (consent_events) | Média | Backend |
| 10 | Nomenclaturas inadequadas em textos visíveis | Média | Vários |
| 11 | Termos hardcoded no frontend — backend tem API mas não é consumida | Baixa | Arquitetura |
| 12 | Sem termos específicos para entregador (usa termos genéricos) | Alta | `TermsOfUse.tsx` |

---

## 1. Landing Page — Diagnóstico e Correções

### Arquivo: `frontend/src/pages/LandingPage.tsx`


### 1.1 Textos com risco (antes → depois)

| # | Texto atual (ANTES) | Texto sugerido (DEPOIS) | Motivo |
|---|---------------------|------------------------|--------|
| 1 | "Entregadores integrados" — "Vincule entregadores à loja, ofereça corridas e acompanhe aceite, retirada e entrega." | "Gestão de entregadores" — "A loja vincula seus entregadores, gerencia aceites e acompanha cada etapa da entrega." | "Ofereça corridas" implica que a plataforma despacha entregas |
| 2 | "Rastreamento" — "Clientes acompanham o pedido do preparo até a porta." | "Acompanhamento em tempo real" — "O cliente acompanha o status do pedido atualizado pela loja e pelo entregador vinculado." | "Até a porta" implica garantia de entrega pela plataforma |
| 3 | "Quando fica pronto, os entregadores recebem a oferta" — "O sistema avisa todos os entregadores vinculados àquela loja que existe uma entrega disponível." | "Quando fica pronto, a loja disponibiliza para entrega" — "O sistema notifica os entregadores vinculados à loja sobre pedidos prontos para retirada." | "O sistema avisa" posiciona a plataforma como despachante |
| 4 | "O primeiro que aceitar assume a corrida" — "Sem confusão manual. O pedido fica vinculado ao entregador certo e o cliente já é informado." | "O entregador aceita e a loja acompanha" — "O sistema registra o aceite e atualiza o status para a loja e o cliente." | "Assume a corrida" implica relação de trabalho com a plataforma |
| 5 | "Cliente acompanha até a entrega final" — "Aceite, retirada, saída para entrega e confirmação final acontecem com push e rastreio no mesmo fluxo." | "Cliente informado em cada etapa" — "O sistema registra as atualizações de status e notifica o cliente conforme a operação da loja avança." | Implica que a plataforma orquestra a entrega |
| 6 | "TEM ENTREGA DISPONÍVEL 🚚" — "Os entregadores vinculados à loja recebem a corrida disponível e o primeiro aceite assume." | "PEDIDO PRONTO PARA ENTREGA 🚚" — "Os entregadores vinculados à loja são notificados sobre o pedido disponível." | "Corrida" e "assume" são termos de app de transporte |
| 7 | "SEU PEDIDO SAIU PARA ENTREGA" — "O cliente acompanha a etapa exata no app e recebe aviso quando o entregador avança." | "SEU PEDIDO SAIU PARA ENTREGA" — "O cliente recebe atualizações de status conforme o entregador da loja avança na entrega." | Adicionar "da loja" para atribuir responsabilidade |
| 8 | "Operação sincronizada do pedido ao pós-entrega" | "Operação sincronizada do pedido à finalização" | "Pós-entrega" implica responsabilidade da plataforma pelo resultado |
| 9 | "Entrega acompanhada" (badge hero) | "Status em tempo real" | Implica que a plataforma provê tracking como serviço próprio |
| 10 | "Entrega no apartamento" (hub condomínios) | "Pedido no apartamento" | Implica que a plataforma entrega |
| 11 | "Pronto para estruturar seu delivery?" (footer) | "Pronto para organizar seus pedidos e entregas?" | "Seu delivery" é ambíguo |
| 12 | "Solução completa para pedidos, operação e entregas com experiência app-like." (footer) | "Ferramenta completa para pedidos, operação e gestão de entregas da sua loja." | "Entregas" como parte da solução implica que a plataforma entrega |
| 13 | "Lojista, cliente e entregador — tudo em um só app." | "Lojista, cliente e entregador da loja — todos no mesmo fluxo." | Agrupar "entregador" como usuário da plataforma implica vínculo |
| 14 | "Notificações push" — "Lojista, entregador e cliente recebem o alerta certo em cada etapa do pedido." | "Notificações push" — "Lojista, entregador vinculado e cliente recebem alertas em cada etapa do pedido." | Adicionar "vinculado" para clareza |
| 15 | "Conecte entregadores e cobre online com Mercado Pago quando quiser." (hero) | "Gerencie entregadores da sua loja e cobre online com Mercado Pago quando quiser." | "Conecte entregadores" implica pool da plataforma |
| 16 | "Acompanhe produção, entregadores, status e cobrança em um painel." | "Acompanhe produção, entregadores vinculados, status e cobrança em um painel." | Adicionar "vinculados" |
| 17 | "Para o entregador, uma operação clara, rápida e sem ruído." | "Para o entregador vinculado à loja, uma operação clara e organizada." | Clarificar vínculo |

### 1.2 Texto adicional sugerido para a landing page

Adicionar na seção de features ou no footer:

> "O Já no Caminho é uma ferramenta tecnológica para o lojista vender online. Produtos, preços, preparo, atendimento e entrega são de responsabilidade do estabelecimento. Entregadores atuam vinculados à loja, não à plataforma."


---

## 2. Checkout e Acompanhamento de Pedido

### 2.1 Checkout (`CartView.tsx` / `StorePage.tsx`)

**Situação atual:** NENHUM disclaimer sobre responsabilidade. O cliente finaliza o pedido sem saber que a loja (não a plataforma) é responsável.

**Ação recomendada:** Adicionar texto discreto antes do botão "Enviar pedido":

> "Este pedido será processado pelo estabelecimento, que é responsável pelos produtos, preparo, preços e entrega."

**Posicionamento UX:** Texto em `text-xs text-slate-500` abaixo do resumo do carrinho, antes do CTA. Não deve ser modal nem bloquear o fluxo.

### 2.2 Order Tracking (`OrderTracking.tsx`)

**Situação atual:** Mostra nome do motoboy quando em trânsito, mas sem indicar que é entregador da loja.

**Ação recomendada:** Quando exibir dados do entregador, adicionar:

> "Entrega realizada por entregador vinculado ao estabelecimento."

**Posicionamento UX:** Texto em `text-[11px] text-slate-400` abaixo do nome do motoboy.

### 2.3 Tela de Sucesso (`SuccessView.tsx`)

**Situação atual:** Sem disclaimer.

**Ação recomendada:** Adicionar no rodapé da tela de sucesso:

> "Em caso de dúvidas sobre o pedido ou entrega, entre em contato com o estabelecimento."

---

## 3. Termos de Uso — Diagnóstico

### Arquivo: `frontend/src/pages/TermsOfUse.tsx`

### 3.1 Pontos positivos (manter)

- ✅ Seção 1: "A Plataforma atua exclusivamente como um intermediador tecnológico" — excelente
- ✅ Seção 2: Lista explícita do que a plataforma NÃO é responsável — excelente
- ✅ Seção 4: "Lojas parceiras são pessoas jurídicas ou físicas independentes" — excelente
- ✅ Redirecionamento de reclamações para a loja — excelente

### 3.2 Lacunas identificadas

| # | Lacuna | Impacto |
|---|--------|---------|
| 1 | Sem seção específica sobre entregadores/motoboys | Não define claramente que entregador é vinculado à loja |
| 2 | Sem termos específicos para o perfil "entregador" | Entregador aceita termos genéricos de "usuário" |
| 3 | Sem menção ao KYC e seu caráter preliminar | Pode ser interpretado como certificação |
| 4 | Sem cláusula sobre compartilhamento de dados do motoboy com a loja | Risco LGPD |
| 5 | Sem cláusula sobre ausência de vínculo empregatício motoboy↔plataforma | Risco trabalhista |
| 6 | LGPD não menciona dados de documentos (CNH, selfie, CRLV) | Coleta sem base legal explícita |

### 3.3 Seções sugeridas para adicionar aos Termos

**Nova Seção — "Entregadores e Operação de Entrega":**

> "Os entregadores cadastrados na plataforma são profissionais independentes que atuam vinculados a estabelecimentos específicos, mediante aprovação do próprio estabelecimento. A plataforma disponibiliza ferramentas tecnológicas para cadastro, validação inicial de apoio, registro de eventos e comunicação entre as partes.
>
> A plataforma NÃO:
> - Contrata, emprega ou subordina entregadores;
> - Garante a conduta, pontualidade ou qualidade do serviço de entrega;
> - Substitui a análise e aprovação do estabelecimento;
> - Certifica definitivamente a identidade ou aptidão do entregador;
> - É responsável por danos causados durante a operação de entrega.
>
> A validação inicial (KYC) realizada pela plataforma tem caráter preliminar e de apoio à segurança do cadastro. Não constitui certificação, garantia ou aprovação para atuação em qualquer estabelecimento. Cada loja é responsável por analisar, aprovar e gerir operacionalmente os entregadores vinculados à sua operação."

**Nova Seção — "Ausência de Vínculo Empregatício":**

> "Não existe qualquer vínculo empregatício, societário, de representação ou de subordinação entre a plataforma e os entregadores cadastrados, nem entre a plataforma e os estabelecimentos parceiros. A relação entre entregador e estabelecimento é de natureza autônoma, cabendo às partes definir condições de atuação."

**Adição à Seção LGPD — "Dados de Documentos (Entregadores)":**

> "Para entregadores, coletamos adicionalmente: foto de documento (CNH), selfie, documento do veículo (CRLV) e resultado de verificação facial. Esses dados são coletados com base no consentimento do titular e na execução do serviço de validação inicial.
>
> Os dados e o status de validação inicial do entregador podem ser compartilhados com o estabelecimento ao qual o entregador solicitar vínculo, exclusivamente para fins de análise da associação. O entregador autoriza esse compartilhamento ao solicitar vínculo com uma loja.
>
> O estabelecimento que receber esses dados compromete-se a utilizá-los exclusivamente para análise da associação, sendo vedado o uso para outras finalidades."

---

## 4. Fluxos de Associação Motoboy ↔ Loja

### 4.1 Situação atual

| Fluxo | Aceite existente | Risco |
|-------|-----------------|-------|
| Motoboy solicita vínculo com loja | ❌ Nenhum checkbox específico | Alto — sem declaração de ciência |
| Loja aprova motoboy | ❌ Nenhum checkbox | Alto — sem aceite de responsabilidade |
| Loja convida motoboy | ❌ Nenhum checkbox | Médio — sem declaração |
| Motoboy aceita convite | ❌ Nenhum checkbox | Médio — sem ciência formal |


### 4.2 Checkboxes obrigatórios a implementar

**Fluxo A — Motoboy solicita vínculo (`MotoboyProfile.tsx`, seção "Solicitar"):**

Antes do botão "Enviar solicitação", exibir checkbox obrigatório:

> ☐ "Declaro estar ciente de que minha solicitação será analisada pelo estabelecimento selecionado. Caso aprovada, minha atuação como entregador será vinculada à operação dessa loja, sob responsabilidade do próprio estabelecimento. Não há vínculo empregatício, societário ou de subordinação com a plataforma Já no Caminho."

Adicionar também:

> ☐ "Autorizo que meus dados cadastrais, documentos e status de validação inicial sejam disponibilizados ao estabelecimento exclusivamente para análise desta solicitação de vínculo."

**Fluxo B — Loja aprova motoboy (`AdminMotoboys.tsx`, botão "Aprovar"):**

Ao clicar "Aprovar", abrir modal de confirmação com checkbox obrigatório:

> ☐ "Declaro que visualizei as informações cadastrais e o status de validação inicial do entregador, quando disponíveis, e que a decisão de aprovar sua associação à minha loja é de responsabilidade do meu estabelecimento. Assumo a responsabilidade pela orientação, gestão operacional e acompanhamento deste entregador na operação de entrega da minha loja."

**Fluxo C — Loja convida motoboy (link de convite / `AdminMotoboys.tsx`):**

Ao copiar/enviar link de convite, exibir texto informativo (não precisa ser checkbox bloqueante pois o convite é apenas um link):

> "Ao convidar um entregador, a eventual atuação dele estará vinculada à sua loja. Cabe ao estabelecimento validar condições de atuação e assumir a gestão operacional."

**Fluxo D — Motoboy aceita convite (`MotoboyProfile.tsx`):**

Se implementar aceite de convite, exibir checkbox:

> ☐ "Declaro estar ciente de que minha atuação será vinculada ao estabelecimento que realizou o convite, cabendo a ele a gestão da operação de entrega. A plataforma Já no Caminho disponibiliza apenas a ferramenta tecnológica."

### 4.3 Arquivos impactados

| Arquivo | Alteração |
|---------|-----------|
| `frontend/src/pages/MotoboyProfile.tsx` | Adicionar checkbox antes de "Enviar solicitação" |
| `frontend/src/pages/AdminMotoboys.tsx` | Adicionar modal de confirmação com checkbox no "Aprovar" |
| `frontend/src/pages/AdminMotoboys.tsx` | Adicionar texto informativo na seção de link de convite |

---

## 5. KYC / Validação Inicial

### 5.1 Situação atual

| Texto atual | Onde aparece | Risco |
|-------------|-------------|-------|
| "Validação feita pela plataforma." | Modal de documentos (AdminMotoboys) | Pode ser interpretado como certificação definitiva |
| "KYC aprovado pela plataforma." | Modal de documentos (AdminMotoboys) | Idem |
| "Aguarde o KYC ser aprovado pela plataforma" | Tooltip do botão Aprovar | Implica que aprovação da plataforma = aprovação total |
| "Aprovado pela plataforma. Documento pronto para solicitação de lojas." | Banner no perfil do motoboy | Implica certificação |

### 5.2 Textos corrigidos

| ANTES | DEPOIS |
|-------|--------|
| "Validação feita pela plataforma." | "Validação inicial de apoio realizada pela plataforma. A aprovação final é responsabilidade do estabelecimento." |
| "KYC aprovado pela plataforma. Se alguma foto estiver ruim, peça reenvio (com motivo)." | "Validação inicial concluída. Analise as informações e decida pela aprovação. A responsabilidade pela associação é do estabelecimento." |
| "Aguarde o KYC ser aprovado pela plataforma para concluir o vínculo." | "Aguarde a validação inicial da plataforma para liberar a aprovação do vínculo pelo seu estabelecimento." |
| "Aprovado pela plataforma. Documento pronto para solicitação de lojas." | "Validação inicial concluída. Você pode solicitar vínculo com lojas. A aprovação final depende de cada estabelecimento." |

### 5.3 Texto informativo para o lojista (adicionar no topo da seção de solicitações)

> "Os entregadores abaixo passaram por validação inicial da plataforma (quando aplicável). Essa validação tem caráter preliminar e de apoio à análise. A aprovação final, autorização de atuação e gestão operacional do entregador são de responsabilidade do seu estabelecimento."

### 5.4 Texto informativo para o motoboy (adicionar no perfil, seção documentos)

> "A validação inicial realizada pela plataforma não garante sua aprovação por qualquer loja. Cada estabelecimento analisa sua solicitação e decide, por sua própria responsabilidade, se aprova ou rejeita a associação."

---

## 6. Painel do Lojista — Ajustes

### 6.1 CreateStore (`CreateStore.tsx`)

**Situação atual:** Modal de termos simplificado com 5 seções genéricas. Não menciona delivery nem responsabilidade sobre entregadores.

**Ação recomendada:** Adicionar seção ao modal de termos:

> "Ao ativar o tipo de pedido 'Entrega', o estabelecimento assume a responsabilidade pela operação de entrega, incluindo: aprovação de entregadores, definição de taxa e raio, gestão operacional e atendimento ao cliente sobre questões de entrega."

### 6.2 Configuração de Entrega (`OrderTypeSettingsCard.tsx` / `BrandingSettings.tsx`)

**Situação atual:** Loja ativa "Entrega" com um toggle sem nenhum aceite.

**Ação recomendada:** Ao ativar "Entrega" pela primeira vez, exibir texto informativo:

> "Ao ativar entregas, seu estabelecimento será responsável pela operação de entrega: aprovação de entregadores, taxa, raio, prazo estimado e atendimento ao cliente."

### 6.3 Mercado Pago (`AdminDashboard.tsx` — GatewayView)

**Situação atual:** Textos adequados — já deixam claro que o dinheiro vai para a conta do lojista. Sem riscos significativos.

**Sugestão de melhoria (opcional):** Adicionar no rodapé da seção:

> "A plataforma não cobra comissão por pedido. Taxas de processamento são do Mercado Pago, aplicadas diretamente na conta conectada pelo lojista."

---

## 7. Painel do Entregador — Ajustes

### 7.1 Nomenclaturas a corrigir

| ANTES | DEPOIS | Arquivo |
|-------|--------|---------|
| "Crie sua conta e receba solicitações das lojas." | "Crie sua conta e solicite vínculo com lojas para atuar como entregador." | `MotoboyRegister.tsx` |
| "Portal do entregador" | "Área do entregador" (já usado em outros lugares — padronizar) | `MotoboyLogin.tsx` |
| "Entre para ver rotas, coletas e entregas." | "Entre para ver pedidos disponíveis e entregas vinculadas à sua loja." | `MotoboyLogin.tsx` |

### 7.2 Checkboxes no cadastro (`MotoboyRegister.tsx`)

**Situação atual:**
- ☐ "Aceito os termos de uso."
- ☐ "Aceito o uso dos meus dados conforme LGPD."

**Sugestão — adicionar terceiro checkbox:**

> ☐ "Declaro estar ciente de que minha atuação como entregador será vinculada a estabelecimentos que aprovarem minha associação, não havendo vínculo empregatício com a plataforma Já no Caminho."

---

## 8. Telas do Usuário Final — Disclaimers

### 8.1 Onde adicionar (discretamente)

| Tela | Texto sugerido | Posição |
|------|---------------|---------|
| Checkout (antes de enviar) | "Pedido processado pelo estabelecimento, responsável por produtos, preparo e entrega." | `text-xs text-slate-500` abaixo do total |
| Order Tracking (quando tem motoboy) | "Entrega realizada por entregador vinculado ao estabelecimento." | `text-[11px] text-slate-400` abaixo do nome do motoboy |
| Tela de sucesso | "Dúvidas sobre o pedido? Fale com o estabelecimento." | Rodapé da tela |
| StorePage (vitrine) | Nenhum — não assustar o cliente na navegação | — |

### 8.2 Princípios de UX

- Textos discretos, nunca em modal bloqueante
- Cor neutra (`slate-400` ou `slate-500`), tamanho pequeno (`text-xs` ou `text-[11px]`)
- Não usar linguagem jurídica pesada na interface do cliente
- Manter tom informativo, não defensivo


---

## 9. LGPD e Compartilhamento de Dados

### 9.1 Lacunas identificadas

| Lacuna | Impacto |
|--------|---------|
| Sem consentimento explícito do motoboy para compartilhar dados com a loja | Violação do princípio de finalidade (LGPD Art. 6º) |
| Sem informação sobre quais dados são compartilhados | Violação do princípio de transparência |
| Sem aceite do lojista sobre uso adequado dos dados recebidos | Risco de uso indevido |
| LGPD não menciona CNH, selfie, CRLV como dados coletados | Coleta sem base legal explícita para dados sensíveis |
| Sem política de retenção específica para documentos de motoboy | Risco de armazenamento indefinido |

### 9.2 Consentimentos a implementar

**Para o motoboy (ao solicitar vínculo):**

> ☐ "Autorizo que meus dados cadastrais, documentos e status de validação inicial sejam disponibilizados ao estabelecimento selecionado exclusivamente para análise da solicitação de vínculo como entregador."

**Para o lojista (ao visualizar documentos do motoboy):**

> Texto informativo (não checkbox): "Os dados e documentos do entregador são disponibilizados exclusivamente para análise da associação com sua loja. O uso para outras finalidades é vedado."

### 9.3 Adições à Política de Privacidade

Adicionar na seção "Dados Coletados":

> "Para entregadores: foto de documento de habilitação (CNH), selfie com documento, documento do veículo (CRLV), dados do veículo (placa, modelo, cor), endereço operacional e chave Pix para repasse."

Adicionar na seção "Compartilhamento de Dados":

> "Dados cadastrais, documentos e status de validação inicial do entregador são compartilhados com o estabelecimento ao qual o entregador solicitar vínculo, exclusivamente para fins de análise da associação. O compartilhamento ocorre mediante consentimento do entregador no momento da solicitação."

Adicionar nova seção "Retenção de Documentos":

> "Documentos de entregadores (CNH, selfie, CRLV) são mantidos enquanto o cadastro estiver ativo. Após exclusão da conta ou inatividade superior a 12 meses, os documentos são removidos dos servidores. Registros de validação (resultado, data, provedor) podem ser mantidos por até 5 anos para fins de auditoria."

---

## 10. Auditoria de Aceites (consent_events)

### 10.1 Situação atual

O sistema **não possui** tabela ou registro estruturado de aceites. Os únicos registros são:
- Checkbox de termos no cadastro (sem persistência além do campo booleano `terms_accepted`)
- Nenhum registro de versão do termo aceito
- Nenhum registro de IP/user-agent
- Nenhum registro de aceites nos fluxos de associação motoboy↔loja

### 10.2 Estrutura sugerida — Tabela `consent_events`

```sql
CREATE TABLE IF NOT EXISTS consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  motoboy_id UUID REFERENCES motoboys(id),
  store_id UUID REFERENCES stores(id),
  event_type TEXT NOT NULL,
  -- Tipos: 'terms_accepted', 'lgpd_accepted', 'motoboy_terms_accepted',
  -- 'motoboy_lgpd_data_sharing', 'motoboy_no_employment_bond',
  -- 'store_motoboy_approval_responsibility', 'store_data_usage_acknowledged',
  -- 'motoboy_store_request_consent', 'motoboy_invite_accepted'
  term_version TEXT,
  term_content_hash TEXT,
  ip_address INET,
  user_agent TEXT,
  origin_screen TEXT,
  metadata JSONB DEFAULT '{}',
  -- metadata pode conter: { previousStatus, newStatus, kycStatus, requestId, etc. }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_events_user ON consent_events(user_id);
CREATE INDEX idx_consent_events_motoboy ON consent_events(motoboy_id);
CREATE INDEX idx_consent_events_store ON consent_events(store_id);
CREATE INDEX idx_consent_events_type ON consent_events(event_type);
```

### 10.3 Eventos a registrar

| Evento | Quando | Dados mínimos |
|--------|--------|---------------|
| `terms_accepted` | Cadastro de usuário/lojista | user_id, version, ip, ua, screen |
| `lgpd_accepted` | Cadastro de usuário/lojista | user_id, version, ip, ua, screen |
| `motoboy_terms_accepted` | Cadastro de motoboy | motoboy_id, version, ip, ua |
| `motoboy_lgpd_accepted` | Cadastro de motoboy | motoboy_id, version, ip, ua |
| `motoboy_no_employment_bond` | Cadastro de motoboy (novo checkbox) | motoboy_id, ip, ua |
| `motoboy_store_request_consent` | Motoboy solicita vínculo | motoboy_id, store_id, ip, ua |
| `motoboy_data_sharing_consent` | Motoboy solicita vínculo | motoboy_id, store_id, ip, ua |
| `store_approval_responsibility` | Loja aprova motoboy | store_id, motoboy_id, user_id (admin), ip, ua |
| `store_data_usage_acknowledged` | Loja visualiza docs (primeira vez) | store_id, motoboy_id, user_id |
| `motoboy_invite_accepted` | Motoboy aceita convite | motoboy_id, store_id, ip, ua |

---

## 11. Nomenclaturas — Substituições no Código

### 11.1 Textos visíveis ao usuário (UI)

| ANTES | DEPOIS | Arquivos |
|-------|--------|----------|
| "Validação feita pela plataforma" | "Validação inicial de apoio" | `AdminMotoboys.tsx` |
| "KYC aprovado pela plataforma" | "Validação inicial concluída" | `AdminMotoboys.tsx` |
| "Aprovado pela plataforma" | "Validação inicial concluída" | `MotoboyProfile.tsx` |
| "Aguardando aprovação do KYC pela plataforma (SUPER_ADMIN)" | "Validação inicial em análise pela plataforma" | `AdminMotoboys.tsx` |
| "Crie sua conta e receba solicitações das lojas" | "Crie sua conta e solicite vínculo com lojas" | `MotoboyRegister.tsx` |
| "Entre para ver rotas, coletas e entregas" | "Entre para ver pedidos e entregas da sua loja" | `MotoboyLogin.tsx` |
| "ofereça corridas" | "disponibilize entregas" | `LandingPage.tsx` |
| "assume a corrida" | "aceita a entrega" | `LandingPage.tsx` |
| "corrida disponível" | "entrega disponível" | `LandingPage.tsx` |

### 11.2 Termos que NÃO devem ser alterados

| Termo | Motivo |
|-------|--------|
| Nomes de tabelas (`motoboys`, `motoboy_stores`, `order_deliveries`) | Impacto estrutural, sem visibilidade ao usuário |
| Nomes de rotas API (`/motoboy/...`, `/api/admin/motoboys/...`) | Impacto em integrações, sem visibilidade ao usuário |
| Enums internos (`ACTIVE`, `PENDING`, `APPROVED`) | Lógica interna, sem visibilidade |
| Nome "motoboy" no código | Convenção interna consolidada |

---

## 12. Mercado Pago e Pagamentos

### 12.1 Situação atual

Os textos de pagamento estão **adequados**. Já deixam claro:
- ✅ "Recebimento direto na conta da loja"
- ✅ "O valor cai na conta Mercado Pago do próprio lojista"
- ✅ "Autorização OAuth segura"
- ✅ "Fallback presencial quando a cobrança online estiver desligada"

### 12.2 Sugestão de adição (opcional)

Na seção de pagamentos da landing page ou no painel:

> "A plataforma Já no Caminho não cobra comissão por pedido. O modelo é baseado em mensalidade. Taxas de processamento de pagamento são aplicadas pelo Mercado Pago diretamente na conta conectada pelo lojista."

---

## 13. Plano de Implementação (Priorizado)

### Fase 1 — Crítica (implementar primeiro)

| # | Ação | Arquivo | Esforço |
|---|------|---------|---------|
| 1 | Checkbox de responsabilidade na aprovação de motoboy pela loja | `AdminMotoboys.tsx` | Pequeno |
| 2 | Checkbox + consentimento LGPD na solicitação de vínculo pelo motoboy | `MotoboyProfile.tsx` | Pequeno |
| 3 | Disclaimer no checkout | `CartView.tsx` ou `StorePage.tsx` | Mínimo |
| 4 | Corrigir textos de KYC (preliminar, não certificação) | `AdminMotoboys.tsx`, `MotoboyProfile.tsx` | Pequeno |
| 5 | Adicionar seção de entregadores nos Termos de Uso | `TermsOfUse.tsx` | Médio |

### Fase 2 — Importante

| # | Ação | Arquivo | Esforço |
|---|------|---------|---------|
| 6 | Corrigir ~17 textos da landing page | `LandingPage.tsx` | Médio |
| 7 | Adicionar checkbox no cadastro do motoboy (sem vínculo empregatício) | `MotoboyRegister.tsx` | Mínimo |
| 8 | Disclaimer no OrderTracking | `OrderTracking.tsx` | Mínimo |
| 9 | Atualizar LGPD com dados de documentos | `TermsOfUse.tsx` | Pequeno |
| 10 | Texto informativo na seção de convite de motoboy | `AdminMotoboys.tsx` | Mínimo |

### Fase 3 — Estrutural

| # | Ação | Arquivo | Esforço |
|---|------|---------|---------|
| 11 | Criar tabela `consent_events` (migration) | Backend | Médio |
| 12 | Registrar aceites nos fluxos implementados | Backend + Frontend | Grande |
| 13 | Versionamento de termos (hash + versão) | Backend | Médio |
| 14 | Migrar termos de hardcoded para API (`site_settings`) | Frontend + Backend | Médio |

---

## 14. Riscos Reduzidos com as Alterações

| Risco | Status após implementação |
|-------|--------------------------|
| Plataforma ser considerada empregadora de motoboys | Mitigado por termos + checkboxes + nomenclatura |
| Plataforma ser responsabilizada por falha na entrega | Mitigado por disclaimers + atribuição clara à loja |
| KYC ser interpretado como certificação/garantia | Mitigado por textos de "validação inicial de apoio" |
| Violação LGPD por compartilhamento sem consentimento | Mitigado por checkbox de autorização |
| Cliente não saber quem é responsável pelo pedido | Mitigado por disclaimers no checkout e tracking |
| Loja não saber que é responsável pelos entregadores | Mitigado por checkbox na aprovação |

---

## 15. Pontos que Ainda Precisam Validação Jurídica

| # | Ponto | Motivo |
|---|-------|--------|
| 1 | Redação final dos termos de uso (seção entregadores) | Envolve direito trabalhista e do consumidor |
| 2 | Base legal para coleta de CNH/selfie/CRLV | Pode exigir consentimento específico vs. legítimo interesse |
| 3 | Cláusula de ausência de vínculo empregatício | Precisa ser robusta para resistir a eventual ação trabalhista |
| 4 | Responsabilidade solidária em caso de acidente durante entrega | Jurisprudência em evolução no Brasil |
| 5 | Termos de compartilhamento de dados com loja | LGPD exige clareza sobre controlador vs. operador |
| 6 | Política de retenção de documentos | Prazo de 12 meses precisa validação legal |
| 7 | Disclaimer no checkout — suficiência legal | Pode não ser suficiente sem aceite explícito |
| 8 | Versionamento de termos — obrigatoriedade de re-aceite | Quando alterar termos, precisa forçar novo aceite? |

---

## 16. Versionamento de Termos — Sugestão

| Campo | Descrição |
|-------|-----------|
| `version` | Semver (ex: `1.0.0`, `1.1.0`, `2.0.0`) |
| `content_hash` | SHA-256 do conteúdo do termo |
| `effective_date` | Data de vigência |
| `requires_reaccept` | Boolean — se `true`, usuários precisam aceitar novamente |

**Regra sugerida:**
- Mudança de `patch` (1.0.x): correção de typo, sem re-aceite
- Mudança de `minor` (1.x.0): adição de cláusula, re-aceite recomendado
- Mudança de `major` (x.0.0): alteração estrutural, re-aceite obrigatório

---

## 17. Resumo de Entregáveis

| # | Entregável | Status |
|---|-----------|--------|
| 1 | Lista de pontos de risco | ✅ Neste documento |
| 2 | Arquivos/telas impactados | ✅ Neste documento |
| 3 | Antes/depois dos textos | ✅ Neste documento |
| 4 | Novos textos para termos | ✅ Neste documento |
| 5 | Sugestão de versionamento | ✅ Neste documento |
| 6 | Sugestão de campos de auditoria | ✅ Neste documento (tabela consent_events) |
| 7 | Ajustes aplicados no código | ⏳ Aguardando aprovação para implementar |
| 8 | Pontos não alterados e motivo | ✅ Seção 11.2 (nomes internos) |
| 9 | Riscos reduzidos | ✅ Seção 14 |
| 10 | Pontos para validação jurídica | ✅ Seção 15 |

---

**Próximo passo:** Após sua revisão deste relatório, posso implementar as alterações de código priorizadas (Fase 1 e 2) em commits separados e rastreáveis.
