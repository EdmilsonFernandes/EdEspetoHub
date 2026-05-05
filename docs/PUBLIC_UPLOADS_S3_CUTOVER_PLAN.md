# Public Uploads S3 Cutover Plan

Data de referência: `2026-05-05`

## Estado atual

Uploads públicos cobertos:

- `products`
- `logos`
- `condominiums`
- `payment`

Buckets atuais:

- públicos: `jnc-public-assets-prod-222984221398`
- privados: `jnc-private-assets-prod-222984221398`
- backups: `jnc-db-backups-prod-222984221398`

Config atual em produção:

- `PUBLIC_UPLOADS_STORAGE_MODE=hybrid`
- `PUBLIC_UPLOADS_S3_BUCKET=jnc-public-assets-prod-222984221398`
- `PUBLIC_UPLOADS_S3_REGION=us-east-2`
- `PUBLIC_UPLOADS_S3_PREFIX=uploads`

Comportamento atual:

- `POST` público: grava em `local + S3`
- `GET` público: tenta `S3` primeiro e cai para `local` em fallback
- uploads privados ainda não fazem parte desta migração

## O que já foi concluído

1. Bucket público criado e validado.
2. Upload de novos arquivos públicos para `local + S3`.
3. Leitura pública híbrida implementada no backend.
4. Migração dos arquivos públicos antigos concluída.
5. Validação real de leitura via `S3` concluída por amostragem.
6. Observabilidade temporária adicionada com `PUBLIC_UPLOADS_DEBUG_LOG`.

Inventário migrado:

- `products=113`
- `logos=29`
- `condominiums=8`
- `payment=7`

## Objetivo da próxima fase

Encerrar a dependência operacional do volume local para uploads públicos e consolidar a leitura/escrita desses assets em `S3`.

## Sequência recomendada

### Fase 1: observação curta em `hybrid`

Manter por um período curto:

- `PUBLIC_UPLOADS_STORAGE_MODE=hybrid`
- `PUBLIC_UPLOADS_DEBUG_LOG=true`

Objetivo:

- confirmar navegação normal nas áreas que carregam produtos, logos, assets de condomínio e assets de pagamento
- observar logs `Served public upload from S3`
- garantir ausência de fallback inesperado para local

### Fase 2: desligar log de debug

Após a observação:

- alterar no SSM:
  - `PUBLIC_UPLOADS_DEBUG_LOG=false`
- redeploy da `api`

Objetivo:

- parar de poluir logs
- manter `hybrid` enquanto a operação ainda está em janela de segurança

### Fase 3: virar públicos para `s3`

Quando a observação estiver estável:

- alterar no SSM:
  - `PUBLIC_UPLOADS_STORAGE_MODE=s3`
- manter:
  - `PUBLIC_UPLOADS_S3_BUCKET=jnc-public-assets-prod-222984221398`
  - `PUBLIC_UPLOADS_S3_REGION=us-east-2`
  - `PUBLIC_UPLOADS_S3_PREFIX=uploads`
- redeploy da `api`

Resultado esperado:

- `POST` público: grava só em `S3`
- `GET` público: lê só de `S3`
- sem dependência do fallback local para pastas públicas

### Fase 4: janela de confirmação pós-cutover

Validar pelo menos:

1. listagem de produtos no admin
2. criação/edição de produto com imagem
3. logo/banner de loja
4. logo/banner/evento de condomínio
5. assets de pagamento
6. logs sem `404` ou falhas de leitura pública

### Fase 5: limpeza posterior

Depois de estabilidade confirmada:

- parar de tratar volume local como fonte dos uploads públicos
- opcionalmente remover arquivos públicos antigos do volume local
- manter privados fora dessa limpeza

## Rollback

Se houver problema após virar para `s3`:

1. voltar no SSM:
   - `PUBLIC_UPLOADS_STORAGE_MODE=hybrid`
2. redeploy da `api`
3. investigar o asset faltante ou chave ausente no bucket

Se for necessário rollback mais conservador:

1. voltar no SSM:
   - `PUBLIC_UPLOADS_STORAGE_MODE=local`
2. redeploy da `api`

## Itens fora deste escopo

Ainda não fazem parte da virada pública:

- `customers`
- `motoboys`
- `tips`
- `FaceVerify`
- leitura direta por CDN no frontend

Esses itens devem ser tratados em uma fase separada de assets privados.

## Checklist rápido para o dia da virada

1. confirmar `PUBLIC_UPLOADS_DEBUG_LOG=false`
2. alterar `PUBLIC_UPLOADS_STORAGE_MODE=s3`
3. redeploy da `api`
4. testar produto, logo, condomínio e payment
5. verificar logs do backend
6. se algo falhar, voltar imediatamente para `hybrid`
