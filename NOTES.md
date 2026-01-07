# Projeto Chama no Espeto - Contexto Atual

## Estado atual (resumo rapido)
- Vitrine premium com hero novo, cards e categorias refinadas.
  - Header simplificado: identidade + acoes.
  - Hero concentra status/horario/WhatsApp.
  - "Id da loja" usa slug.
  - Cores primaria/secundaria aplicadas corretamente.
- Fila do churrasqueiro usa o mesmo header do admin e mantem tema/cores.
- Admin:
  - Header unico para todas as telas (Dashboard, Pedidos, Fila).
  - Tela de pedidos limpa (so lista).
  - Dashboard com receita total/mes/periodo, ticket medio, grafico melhorado e filtro 30/60/90/tudo.
- Cadastro:
  - Agora pede CPF/CNPJ, aceita termos/LGPD e endereco separado com CEP (via ViaCEP).
  - Termos de uso em modal premium (nao perde dados ao abrir).
  - Paleta de cores por escolha visual (sem expor codigo hex).
  - Preview do logo corrigido com upload.
- Checkout:
  - Autocomplete de cliente (3+ letras) com preenchimento automatico do telefone.
  - Clientes recentes antes de digitar.
  - Mesa com selecao rapida (1-12) + campo "outra mesa".
  - Visual "iFood-like" no bloco de dados do pedido.
- Som na fila:
  - Ligado por padrao, salva preferencia.
  - Botao "Testar som".
- Mercado Pago:
  - Integracao com webhook, QR normalizado.
  - Idempotency key adicionada.
  - Cai em mock apenas se MP falhar.
- Email:
  - SMTP (Gmail com senha de app).
  - Reset de senha + paginas `ForgotPassword` e `ResetPassword`.
  - Email de confirmacao mais premium (header com gradiente).
  - Email de ativacao com logo e links.
- Assinaturas:
  - Avisos por e-mail em D-3, D-1 e D-0.
  - `reminder_stage` evita envio duplicado.
  - Renovacao no admin com escolha de plano e pagamento.
  - Admin expirada cai em `/admin/renewal`.
- Pagamento:
  - Linha do tempo do usuario mostra apenas status + data.
  - Admin login sem valores predefinidos.
  - Sessao expirada limpa `adminSession` e redireciona pro login.

## Arquivos principais mexidos
- frontend/src/components/Client/MenuView.tsx
- frontend/src/components/Client/CartView.tsx
- frontend/src/pages/OrdersQueue.tsx
- frontend/src/components/Admin/AdminHeader.tsx
- frontend/src/pages/AdminDashboard.tsx
- frontend/src/pages/AdminOrders.tsx
- frontend/src/pages/AdminQueue.tsx
- frontend/src/components/Admin/DashboardView.tsx
- frontend/src/components/Admin/GrillQueue.tsx
- frontend/src/components/Admin/ProductManager.tsx
- backend/src/services/PaymentService.ts
- backend/src/services/MercadoPagoService.ts
- backend/src/services/EmailService.ts
- backend/src/services/AuthService.ts
- backend/schema.sql
- backend/src/entities/PasswordReset.ts
- frontend/src/pages/ForgotPassword.tsx
- frontend/src/pages/ResetPassword.tsx
- frontend/src/services/authService.ts

## Observacoes importantes
- Som so toca apos interacao do usuario (limitacao do navegador).
- Mercado Pago exige chave PIX cadastrada (em teste pode bloquear).
- Admin login bloqueado se pagamento pendente.
- Email real depende de SMTP valido (Gmail com senha de app).
- Pagamento aprovado atualiza status via webhook Mercado Pago; sem HTTPS nao chega.

## DNS / Dominio (Registro.br)
- Ativar modo avancado em "Configurar enderecamento" -> "Modo avancado".
- Se a tabela mostrar "Dominio em transicao", aguardar alguns minutos e recarregar.
- Quando liberar, criar registros:
  - A @ -> Elastic IP
  - A www -> Elastic IP (ou CNAME www -> @)
- Propagacao pode levar minutos ate horas.

## Deploy EC2 (resumo tecnico)
- Nginx como reverse proxy para HTTPS.
  - `/` -> `http://127.0.0.1:8080`
  - `/api/` -> `http://127.0.0.1:4000/api/`
  - `/uploads/` -> `http://127.0.0.1:4000/uploads/`
- Nginx precisa de `client_max_body_size 20m` para upload de logo.
- Certbot configurado para `chamanoespeto.com.br` e `www.chamanoespeto.com.br`.
- Docker Compose usa `.env.prod` com `FRONTEND_PORT=8080` (front fica atras do Nginx).
- Arquivo de exemplo do Nginx: `docs/nginx/chamanoespeto.conf`.

## Mercado Pago (producao)
- Variaveis obrigatorias no `backend/.env.docker`:
  - `MP_ACCESS_TOKEN`
  - `MP_PUBLIC_KEY`
  - `MP_WEBHOOK_SECRET`
  - `MP_WEBHOOK_URL=https://www.chamanoespeto.com.br/api/webhooks/mercadopago`
- Webhook exige HTTPS valido.
- Painel MP: eventos de Pagamentos ativados.
