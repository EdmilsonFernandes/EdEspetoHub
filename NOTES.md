# Projeto Chama no Espeto - Contexto Atual

## Estado atual (resumo rapido)
- Vitrine premium com hero novo, cards e categorias refinadas.
  - Header simplificado: identidade + acoes.
  - Hero concentra status/horario/WhatsApp.
  - "Id da loja" usa slug.
  - Cores primaria/secundaria aplicadas corretamente.
- Landing page com vitrine real das telas (prints), modal com navegacao e CTA fixo no mobile.
- Prova social (lojas ativas, pedidos e vendas) via endpoint publico + simulador de ganhos.
- Mobile: header compacto + botao "Info" com sheet de endereco/WhatsApp/Instagram/horarios.
- Mapa estatico gratuito (OpenStreetMap) no mobile com cache de coordenadas.
- Fila do churrasqueiro usa o mesmo header do admin e mantem tema/cores.
- Fila de Producao com visual mais clean (alinhado ao cardapio):
  - menos ruido visual, cards mais neutros e leitura direta.
  - banner de modo foco com toggle de atalhos.
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
- Pedido feito por admin volta para o cardapio (nao envia WhatsApp/tracking).
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
- Trial:
  - Periodo gratis configuravel via `site_settings` (`trial_days`).
  - Confirmou e-mail, loja ativa e envia e-mail de ativacao.
  - Banner premium no admin mostra dias restantes e CTA de renovacao.
- SEO:
  - Meta tags dinamicas por loja (OG/Twitter + favicon do cliente).
  - `sitemap.xml` e `robots.txt` com sitemap.
- Pagamento:
  - Linha do tempo do usuario mostra apenas status + data.
  - Admin login sem valores predefinidos.
  - Sessao expirada limpa `adminSession` e redireciona pro login.
  - Logos de pagamento (Pix/Cartao/Mercado Pago) em telas publicas e admin.
  - Renovacao gera novo link se pagamento expirou/failed.
- Landing:
  - Secao "Produto real" com galeria expandida dos prints.
  - Modal de visualizacao com atalhos (← →) e botoes para navegar.
  - CTA fixo no mobile para conversao.
  - Simulador de ganhos com ticket medio e pedidos por dia.
- Acompanhamento publico:
  - Pagina `/pedido/:orderId` com timeline, status e fila.
  - Branding da loja aplicado (logo, cores, titulo, favicon).
  - Ultimos 3 pedidos do usuario publico ficam salvos em `localStorage` e habilitam CTA com selecao na vitrine.
  - Numero exibido usa prefixo do slug (3 letras) + 8 primeiros chars do ID.
  - Entrega finaliza em "Saiu para entrega" (sem status de motoboy).
  - Tempo total destacado ao finalizar.
- Checkout (entrega):
  - Endereco separado com CEP + ViaCEP.
  - Link de mapa (OpenStreetMap) em vez de iframe.
  - Autocomplete de cliente apenas para admin.
- Produtos:
  - Campo de descricao persistido e exibido na vitrine.
  - Preco promocional e promocao ativa por produto (aplica no pedido).
- Espetos:
  - Seleciona ponto da carne e "passar varinha" por item na vitrine.
  - Opcoes aparecem no pedido (fila/admin/WhatsApp/tracking).
- Loja:
  - Tipos de pedido configuraveis (entrega, retirada, mesa).
- Vitrine:
  - Banner "Acompanhar pedido" para publico usando `localStorage` (inclui pedidos de mesa).
  - Botao "Info" abre sheet com endereco, contatos e horarios.
  - Bloco "Mais pedidos hoje" (Top 3) no topo do cardapio (carrossel no mobile).
  - Promoção do dia no topo do cardapio + badge nos itens.
  - Produto com promocao mostra preco riscado e aplica preco promocional no pedido.
  - Botao "Compartilhar cardapio" e dicas "Salvar no celular" (iOS/Android).
  - Botao "Pedir novamente" no acompanhamento do pedido (reaplica itens no carrinho).
  - Admin: "Cardapio" no resumo com copiar link + gerar PDF.
  - Fila: "Modo TV" (tela limpa + relogio + fullscreen).
  - Configuracoes: botao "Salvar alteracoes" visivel para Pix/Email.

## Arquivos principais mexidos
- frontend/src/components/Client/MenuView.tsx
- frontend/src/components/Client/CartView.tsx
- frontend/src/pages/OrdersQueue.tsx
- frontend/src/pages/OrderTracking.tsx
- frontend/src/components/Admin/AdminHeader.tsx
- frontend/src/pages/AdminDashboard.tsx
- frontend/src/pages/AdminOrders.tsx
- frontend/src/pages/AdminQueue.tsx
- frontend/src/components/Admin/DashboardView.tsx
- frontend/src/components/Admin/GrillQueue.tsx
- frontend/src/components/Admin/ProductManager.tsx
- frontend/src/components/Cart/ProductModal.tsx
- frontend/src/pages/LandingPage.tsx
- frontend/public/marketing/*
- backend/src/services/PaymentService.ts
- backend/src/services/MercadoPagoService.ts
- backend/src/services/EmailService.ts
- backend/src/services/AuthService.ts
- backend/src/controllers/OrderController.ts
- backend/src/controllers/PlatformPublicController.ts
- backend/schema.sql
- backend/src/entities/Product.ts
- backend/src/services/OrderService.ts
- backend/src/services/ProductService.ts
- backend/src/dto/CreateProductDto.ts
- backend/src/entities/PasswordReset.ts
- frontend/src/pages/ForgotPassword.tsx
- frontend/src/pages/ResetPassword.tsx
- frontend/src/services/authService.ts
- frontend/src/services/productService.ts
- frontend/src/pages/StorePage.tsx
- frontend/src/components/Client/MenuView.tsx

## Observacoes importantes
- Som so toca apos interacao do usuario (limitacao do navegador).
- Mercado Pago exige chave PIX cadastrada (em teste pode bloquear).
- Admin login bloqueado se pagamento pendente.
- Email real depende de SMTP valido (Gmail com senha de app).
- Pagamento aprovado atualiza status via webhook Mercado Pago; sem HTTPS nao chega.
- Postgres pode entrar em loop se o `pg_hba.conf` for corrompido (ex.: linha `EOF` invalida). Workaround: reescrever o arquivo no volume e resetar a senha sem apagar dados.
- Endpoint publico de metricas: `/api/public/platform/metrics`.

## Fluxo atual (como funciona hoje)
1. Cliente fecha pedido normalmente no cardapio.
2. Quando o pedido e finalizado, cliente pode avaliar loja/entregador.
3. Se escolher gorjeta, o sistema gera PIX da gorjeta (Mercado Pago quando configurado).
4. Webhook confirma a gorjeta e atualiza status (`PENDING`, `PAID`, `FAILED`).
5. No acompanhamento do pedido, cliente ve QR/copia-e-cola e status da gorjeta.
6. Loja recebe esse valor e faz repasse manual para o motoboy.
7. Motoboy cadastra chave PIX no perfil (`/motoboy/profile`).
8. Regra de seguranca: chave aceita somente CPF valido; se ja houver CPF no cadastro, precisa bater com o CPF do entregador.
9. No Admin > Entregadores, a loja ve a chave PIX do motoboy para repassar.
10. Fila de Producao (`/admin/queue`) ficou mais clean no estilo do cardapio e com modo foco.

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

## Workaround Postgres (pg_hba.conf corrompido)
Sintoma: container `janocaminho-postgres` reiniciando com "invalid connection type \"EOF\"".

1) Descobrir o volume:
```bash
docker volume ls | grep postgres
```

2) Reescrever `pg_hba.conf` em modo trust:
```bash
docker stop janocaminho-postgres
docker run --rm -v edespetohub_postgres-data:/var/lib/postgresql/data alpine \
  sh -c "printf 'local all all trust\nhost all all all trust\n' > /var/lib/postgresql/data/pg_hba.conf"
docker start janocaminho-postgres
```

3) Resetar senha e voltar para scram:
```bash
docker exec -it janocaminho-postgres psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
docker run --rm -v edespetohub_postgres-data:/var/lib/postgresql/data alpine \
  sh -c "printf 'local all all scram-sha-256\nhost all all all scram-sha-256\n' > /var/lib/postgresql/data/pg_hba.conf"
docker restart janocaminho-postgres
docker restart chamanoespeto-api
```

## Mercado Pago (producao)
- Variaveis obrigatorias no `backend/.env.docker`:
  - `MP_ACCESS_TOKEN`
  - `MP_PUBLIC_KEY`
  - `MP_WEBHOOK_SECRET`
  - `MP_WEBHOOK_URL=https://www.chamanoespeto.com.br/api/webhooks/mercadopago`
- Webhook exige HTTPS valido.
- Painel MP: eventos de Pagamentos ativados.

## RESUME - 2026-03-23

### Correcoes aplicadas hoje (ultimas)
- Admin: corrigida inconsistencia de navegacao entre `/admin/dashboard` e `/admin/orders`.
  - `Pedidos` agora abre rota dedicada `/admin/orders` de forma consistente.
  - Fluxo antigo por aba interna foi ajustado para evitar perder modo cards/tabela.
- Admin Queue: header padronizado para nao "sumir" em transicoes (catalogo -> pedidos/fila).
- Create Store (redes sociais): refatorado para UX robusta.
  - Removido comportamento que travava/confundia no campo de nome da rede.
  - Novo fluxo por checkbox de rede (Instagram, Facebook, Twitter/X, TikTok, YouTube, LinkedIn).
  - Campo de usuario/URL aparece somente quando a rede esta marcada.
  - Payload saneado para enviar apenas redes selecionadas e com valor.

### Commits do dia relacionados
- `6e5ef47` - `fix(admin): unifica navegacao de pedidos e padroniza header da fila`
- `142f84b` - `fix(create-store): permite digitar tipo de rede social`
- `a27fa94` - `fix(create-store): redes sociais com checkbox e campo por rede`

### Status
- Todos os ajustes acima foram commitados e enviados para `origin/main`.

## RESUME - 2026-03-30

### Navegação Admin (arquitetura + UX)
- Sidebar refatorada para arquitetura hierárquica (accordion/submenus) em desktop e mobile drawer.
  - Agrupamentos: Principal, Vendas, Catálogo, Financeiro, Gestão, Sistema.
  - Mantida compatibilidade de rotas (sem quebra de links existentes).
- Polimento visual premium do menu:
  - contraste refinado (dark slate/navy),
  - estado ativo mais limpo (fundo sutil + borda esquerda),
  - hierarquia de tipografia pai/filho,
  - linha-guia de submenus.
- Drawer mobile ajustado para estilo lista limpa (menos “pílulas”), com melhor respiro e legibilidade.
- Botão hambúrguer mobile reforçado para melhor descoberta.

### Nomenclatura de Vendas (clareza operacional)
- Renomeações aplicadas na UI de navegação:
  - `Pedidos ao vivo` -> `Gestor de Pedidos`
  - `Pedidos` -> `Histórico de Pedidos`
- Ícone de histórico trocado de carrinho para ícone de lista/histórico (`ClipboardText`), sem alterar rotas.

### Estoque (estabilidade + usabilidade)
- Fluxo de ajuste de estoque reforçado:
  - entrada/saída/definir total com feedback imediato,
  - filtros e usabilidade de movimentações melhorados,
  - origem e contexto de movimentação amigáveis.
- Movimentações enriquecidas:
  - link para pedido (`/admin/orders?orderId=...`) quando aplicável,
  - exibição de cliente e origem normalizada (Admin/Operador/Sistema/Canal cliente).
- No modal de ajuste de estoque:
  - exibição de `Estoque atual`,
  - cálculo de `Resultado previsto` antes de salvar.

### Vitrine/Checkout (consistência sem refresh)
- Correção de estoque “stale” após finalizar pedido:
  - reconciliação otimista local (baixa imediata no front),
  - revalidação em background (`listPublicBySlug`) para consistência final,
  - elimina necessidade de refresh manual após venda do último item.
- Limite de estoque no carrinho:
  - tentativa de exceder estoque agora mostra aviso (toast) claro,
  - incremento bloqueado sem falha silenciosa.

### Rodapé de versão (contexto de build)
- Exibição de versão adicionada também no menu lateral/admin:
  - desktop sidebar,
  - drawer mobile.
- Mantido padrão: `Desenvolvido por Já no Caminho | vX.Y.Z`.

### Commits principais do ciclo recente
- `ee90ef0` - feat: reorganizar navegação em grupos com submenus no desktop e mobile
- `1af4a3b` - refactor(admin-nav): polish sidebar and mobile drawer visual hierarchy
- `f3cd21a` - feat(ui): add sidebar version badge and stock-limit feedback
- `bb038dd` - fix(store): refresh local stock state after checkout without page reload
- `b6ae0a3` - feat(inventory): show current and projected stock in adjust modal

### Status
- Ajustes críticos de navegação + estoque concluídos e em `origin/main`.
- `NOTES.md` atualizado para servir como referência de contexto nas próximas sessões.

## RESUME - 2026-04-02

### Incidente de banco e recuperação
- Banco `espetinho` foi perdido em produção e restaurado de backup (`espetinho_20260401T031501Z.sql.gz`).
- Após restore, schema estava defasado em relação à API atual; colunas/tabelas de migração foram reaplicadas para normalizar login, pedidos e produtos.
- Indicadores de comprometimento no Postgres exigem postura de incidente de segurança.

### Hardening mínimo aplicado
- Grupo de segurança da instância de produção revisado para manter apenas:
  - `80/tcp` público
  - `443/tcp` público
  - `22/tcp` restrito ao IP administrativo
- Recomendada rotação de credenciais de banco e segredos após incidente.

### Política nova de backup (produção)
- Padronizar backup automático a cada 4 horas com rotação (manter somente o mais recente).
- Cron recomendado:
  - `0 */4 * * * BACKUP_DIR=/var/backups/chamanoespeto MIN_INTERVAL_HOURS=4 KEEP_LATEST=1 sh /home/ec2-user/EdEspetoHub/scripts/pg-backup-rotate.sh >> /var/log/pg-backup.log 2>&1`
