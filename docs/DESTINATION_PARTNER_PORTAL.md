# Portal do Parceiro de Destinos

Este fluxo permite que chalés, pousadas, serviços, restaurantes e parceiros de destino atualizem dados próprios sem depender do Super Admin para cada pequena alteração.

## Objetivo

Escalar destinos sem transformar o Super Admin em gargalo operacional.

O parceiro pode manter informações públicas simples e seguras:

- nome/título público;
- descrição;
- telefone, WhatsApp, Instagram e site;
- endereço, CEP, cidade, UF e coordenadas;
- logo, banner ou imagem principal;
- instruções de entrega, quando for hospedagem.

O parceiro não pode alterar campos estratégicos:

- ativo/inativo;
- cidade/destino vinculado;
- categoria;
- ordem/prioridade;
- destaque;
- vínculo com lojas/hospedagens;
- monetização ou posicionamento.

## Fluxo Operacional

1. Parceiro solicita entrada pelo fluxo público de destinos.
2. O backend envia aviso interno para análise do Já no Caminho.
3. Super Admin revisa a solicitação.
4. Ao aprovar, o backend cria o chalé/pousada ou serviço/restaurante, ou apenas concede acesso se a solicitação veio de um convite para assumir perfil existente.
5. O backend cria ou reaproveita uma conta em `destination_partner_accounts`.
6. O backend cria a permissão em `destination_partner_permissions`.
7. O backend gera convite em `destination_partner_invites`.
8. O parceiro recebe e-mail para criar senha.
9. O parceiro acessa `/parceiro` e edita apenas os campos liberados.
10. Alterações ficam auditadas em `destination_partner_audit_logs`.

## Telas

- `/parceiro`: login e painel do parceiro.
- `/parceiro/ativar?token=...`: ativação do convite e criação de senha.
- Super Admin continua gerenciando aprovações em `Destinos`.

## Convite para assumir perfil existente

Quando o Super Admin já cadastrou um chalé/pousada manualmente, o convite público de hospedagem envia o usuário para `/destinos/cadastrar` com:

- `source=hospitality_place_claim`;
- `placeId`;
- dados públicos já preenchidos.

O backend grava esses dados em:

- `destination_partner_requests.request_source`;
- `destination_partner_requests.claimed_hospitality_place_id`;
- `destination_partner_requests.claimed_listing_id`, reservado para serviços/listings.

Ao aprovar uma solicitação com `claimed_hospitality_place_id`, o sistema não cria outro chalé. Ele vincula a conta do parceiro ao registro existente e registra `created_hospitality_place_id` com o mesmo ID. Isso evita duplicidade de perfil público.

No Super Admin, solicitações desse tipo aparecem com o selo **Assumir perfil existente** e um alerta de verificação de titularidade.

Proteções contra claim malicioso:

- a aprovação via API exige `claimVerified: true` para solicitações que tentam assumir perfil existente;
- a tela do Super Admin pede confirmação explícita antes de aprovar;
- o backend bloqueia liberar um segundo parceiro ativo para o mesmo chalé/pousada ou serviço;
- antes de aprovar, o operador deve confirmar o responsável pelo WhatsApp/e-mail oficial já cadastrado no perfil público.

## Reenvio de convite

Depois da aprovação, o Super Admin pode reenviar o convite do parceiro. O endpoint invalida convites antigos ainda não usados, gera um novo link com validade de 14 dias e tenta enviar o e-mail novamente.

Rota backend/BFF:

- `POST /api/admin/destination-partner-requests/:requestId/invite/resend`

Comportamento:

- se a conta ainda não foi ativada, gera um novo link de ativação;
- se o e-mail falhar, o Super Admin ainda recebe o link para copiar e enviar manualmente;
- se a conta já está ativa, retorna o link do portal `/parceiro`.

O link de ativação é sensível e só é retornado para Super Admin autenticado.

A tela de solicitações também destaca:

- pendentes;
- claims de perfil existente;
- parceiros aprovados aguardando ativação;
- parceiros com portal ativo.

## Parceiro virar loja

No portal `/parceiro`, serviços/restaurantes vinculados a `DESTINATION_LISTING` exibem o CTA **Quero receber pedidos**.

Esse botão abre `/create` com `source=destination_listing_claim` e dados já preenchidos:

- nome do serviço como nome da loja;
- descrição;
- telefone/WhatsApp;
- cidade/UF;
- vínculo com o destino/listing.

O cadastro de loja continua seguindo o fluxo normal de lojista. O vínculo definitivo entre loja e listing ainda deve ser validado pelo Super Admin para evitar tomada indevida de perfil.

## Backend

Arquivos principais:

- `backend/src/services/DestinationPartnerPortalService.ts`
- `backend/src/controllers/DestinationPartnerPortalController.ts`
- `backend/src/entities/DestinationPartnerAccount.ts`
- `backend/src/entities/DestinationPartnerInvite.ts`
- `backend/src/entities/DestinationPartnerPermission.ts`
- `backend/src/entities/DestinationPartnerAuditLog.ts`
- `backend/src/services/DestinationService.ts`

Rotas:

- `POST /api/destination-partner/auth/login`
- `POST /api/destination-partner/auth/activate`
- `GET /api/destination-partner/me`
- `GET /api/destination-partner/resources`
- `PATCH /api/destination-partner/hospitality-places/:placeId`
- `PATCH /api/destination-partner/listings/:listingId`
- `POST /api/admin/destination-partner-requests/:requestId/invite/resend`

Role JWT:

- `DESTINATION_PARTNER`

## BFF

As rotas são repassadas pelo proxy em:

- `apis/src/domains/proxy/proxy.routes.ts`

O frontend sempre chama `/api/...`; não chamar o backend direto.

## Frontend

Arquivos principais:

- `frontend/src/pages/DestinationPartnerPortal.tsx`
- `frontend/src/pages/DestinationPartnerActivate.tsx`
- `frontend/src/services/destinationPartnerPortalService.ts`
- `frontend/src/App.tsx`

Sessão local:

- `localStorage.destinationPartnerSession`

## E-mail

Templates gerenciados:

- `destination_partner_request_notification`: aviso interno quando uma solicitação nova é criada ou reenviada enquanto ainda está pendente.
- `destination_partner_invite`

Cadastro base:

- `backend/src/utils/emailTemplateCatalog.ts`

Envios:

- `EmailService.sendDestinationPartnerRequestNotification`
- `EmailService.sendDestinationPartnerInvite`

Destinatários do aviso interno:

- `AUDIT_NOTIFICATION_EMAIL`, com fallback `edmls2008@gmail.com`;
- `NOTIFY_ON_SIGNUP_EMAILS`, quando configurado;
- `contato@janocaminho.com.br`.

## Segurança

O parceiro só consegue editar recurso com permissão ativa em `destination_partner_permissions`.

O update do portal ignora campos sensíveis mesmo que sejam enviados no payload, como `active`, `sortOrder`, `featured`, `destinationId` ou vínculos.

O portal mostra um checklist de publicação para reduzir suporte operacional: imagem principal, descrição, contato, endereço e coordenadas.

## Validação

Backend:

```bash
cd backend
yarn test
npm run docs:schema
```

Frontend:

```bash
npm --prefix frontend run test:unit
npm --prefix frontend run build
```

BFF:

```bash
npm --prefix apis run build
```
