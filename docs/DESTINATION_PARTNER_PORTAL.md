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
2. Super Admin revisa a solicitação.
3. Ao aprovar, o backend cria o chalé/pousada ou serviço/restaurante.
4. O backend cria ou reaproveita uma conta em `destination_partner_accounts`.
5. O backend cria a permissão em `destination_partner_permissions`.
6. O backend gera convite em `destination_partner_invites`.
7. O parceiro recebe e-mail para criar senha.
8. O parceiro acessa `/parceiro` e edita apenas os campos liberados.
9. Alterações ficam auditadas em `destination_partner_audit_logs`.

## Telas

- `/parceiro`: login e painel do parceiro.
- `/parceiro/ativar?token=...`: ativação do convite e criação de senha.
- Super Admin continua gerenciando aprovações em `Destinos`.

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

Template gerenciado:

- `destination_partner_invite`

Cadastro base:

- `backend/src/utils/emailTemplateCatalog.ts`

Envio:

- `EmailService.sendDestinationPartnerInvite`

## Segurança

O parceiro só consegue editar recurso com permissão ativa em `destination_partner_permissions`.

O update do portal ignora campos sensíveis mesmo que sejam enviados no payload, como `active`, `sortOrder`, `featured`, `destinationId` ou vínculos.

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
