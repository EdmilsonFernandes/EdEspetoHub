# AGENT RULES

Você é um agente técnico responsável por executar tarefas completas de desenvolvimento. O deploy é feito pelo próprio usuário.

## REGRA PRINCIPAL
A tarefa só está concluída quando:
1. Código alterado
2. Validado
3. Commit feito
4. Push feito
5. Informar ao usuário: commit hash, escopo e qual script rodar

---

## AMBIENTE

Servidor:
cd ~/EdEspetoHub

Deploy principal por imagem pronta (GHCR, o usuário executa):
scripts/./deploy-release-frontend.sh  
scripts/./deploy-release-api.sh  

Deploy preferido em produção com aprovação:
.github/workflows/deploy-production.yml
Nome no GitHub Actions: `Deploy to EC2 (Approval)`

Fallback legado (se o fluxo novo falhar):
scripts/./deploy-frontend.sh  
scripts/./deploy-api.sh  

Workflow de release:
.github/workflows/publish-ghcr.yml
Nome no GitHub Actions: `Publish Docker Images (GHCR)`

---

## DECISÃO DE DEPLOY (informar ao usuário)

- frontend alterado → preferir `scripts/./deploy-release-frontend.sh`
- backend alterado → preferir `scripts/./deploy-release-api.sh`
- ambos alterados → `scripts/./deploy-release-api.sh` e depois `scripts/./deploy-release-frontend.sh`
- se o workflow `Deploy to EC2 (Approval)` estiver configurado e pronto → preferir mandar o usuário aprovar esse workflow
- ao recomendar o workflow aprovado, considerar o escopo real da mudança (`frontend`, `api`, `face-worker` ou combinação), evitando subir serviço sem imagem nova
- scripts/compose/infra alterados → avisar que o servidor pode precisar de `git pull` antes do deploy novo
- se o fluxo GHCR não estiver pronto ou falhar → informar fallback com `deploy-api.sh` / `deploy-frontend.sh`
- não é obrigatório acompanhar o workflow/deploy depois do push, a menos que o usuário peça isso explicitamente

### ANDROID / AAB
- se a mudança tocar código nativo mobile, Capacitor, plugins nativos, `MainActivity`, `AndroidManifest`, `build.gradle`, `capacitor.config`, `res/` Android ou qualquer fluxo que exija novo binário Android → gerar novo `AAB`
- ao gerar novo `AAB`, subir sempre:
  - `versionCode` +1
  - `versionName` compatível com a nova versão
- validar com:
  - `npm --prefix frontend run build`
  - `npm --prefix mobile run android:sync`
  - `mobile/android/gradlew.bat clean bundleRelease`
- informar no fechamento:
  - caminho do `.aab`
  - `versionCode`
  - `versionName`
- não esperar o usuário pedir o `AAB` quando ele for claramente necessário

---

## ARQUITETURA DE SERVIÇOS (como o sistema funciona)

```
Cliente (browser/app)
    │  fetch('/api/...')
    ▼
Nginx EC2 (:443) → Frontend container (:80)
    │
    ├── /*           → arquivos estáticos React (SPA)
    ├── /api/*       → proxy_pass apis:5000 (BFF)
    ├── /api/maps/*  → proxy_pass apis:5000 (BFF)
    └── /uploads/*   → proxy_pass api:4000  (backend direto, só arquivos)
    │
    ▼  (/api/*)
APIs BFF (janocaminho-apis :5000)
    ├── Rotas com lógica própria (bus in-memory):
    │     auth, customer, orders (processors)
    ├── Proxy catch-all (proxy.routes.ts):
    │     ~150+ rotas → forward() → http://api:4000/api/*
    └── Middleware: authRequired/authOptional + error
    │
    ▼
Backend API (chamanoespeto-api :4000)
    └── Express + TypeORM + PostgreSQL (motor real)
```

### Containers em produção

| Container | Imagem | Porta | Função |
|-----------|--------|-------|--------|
| janocaminho-frontend | edespetohub-frontend | 8080→80 | SPA React + nginx (proxy /api→apis) |
| janocaminho-apis | edespetohub-apis | 5000 | BFF Express (rotas + proxy pro backend) |
| janocaminho-backend | edespetohub-api | 4000 | Backend real (TypeORM, jobs, banco) |
| janocaminho-face-worker | edespetohub-face-worker | 8000 | Verificação facial (Python) |
| janocaminho-postgres | postgres:16 | 5432 | Banco de dados |

### Regras de implementação por camada

- **Frontend (`frontend/`)**: SPA puro. Não tem lógica de API. Usa `apiClient.ts` que faz fetch relativo (`/api/...`). Nunca fala direto com o backend.
- **APIs BFF (`apis/`)**: camada intermediária. Recebe todas as chamadas do frontend. Pode ter lógica própria (processors via bus) ou fazer proxy transparente pro backend. Toda rota nova que o frontend precisar deve ser registrada aqui.
- **Backend (`backend/`)**: motor de dados. TypeORM, migrations, jobs, webhooks, uploads. O BFF consome ele via HTTP interno (`http://api:4000/api`).

### Onde implementar algo novo

- **Nova rota que o frontend consome**: registrar no BFF (`apis/src/domains/proxy/proxy.routes.ts` se for proxy, ou criar controller+processor se tiver lógica própria).
- **Nova lógica de negócio/banco**: implementar no backend (`backend/`). O BFF faz proxy.
- **Novo componente visual**: frontend (`frontend/src/`).
- **Alterar roteamento nginx**: `frontend/nginx.conf`.

### Env do BFF em produção

Arquivo `apis/.env.docker` no EC2 (não vai pro git):
```
PORT=5000
BACKEND_URL=http://backend:4000/api
JWT_SECRET=<mesmo do backend>
NODE_ENV=production
```

### Deploy do BFF

- Imagem: `ghcr.io/edmilsonfernandes/edespetohub-apis:<tag>`
- Script: `scripts/deploy-release-apis.sh`
- Workflow: incluído no `publish-ghcr.yml` e `deploy-production.yml`

---

## FLUXO OBRIGATÓRIO

### 1. ENTENDER
- Resumir objetivo em 1 frase

### 2. ESCOPO
- frontend / backend / apis / ambos

### 3. ALTERAR
- Alterar apenas o necessário
- Não refatorar fora do pedido

### 4. VALIDAR
- Revisar diff
- Validar lógica

### 5. GIT LOCAL
git status  
git add <arquivos específicos>  
git commit -m "<mensagem clara>"  
git push  

### 6. INFORMAR O USUÁRIO
Após o push, reportar:
- Commit hash (ex: `a1b2c3d`)
- Escopo: frontend / backend / apis / ambos
- Script(s) a rodar no servidor
- Se o usuário pedir acompanhamento de deploy, informar o status do workflow/imagens/aprovação
- Se houver mudança de infra/scripts, avisar se será necessário `git pull` no servidor

---

## USO DE SSH

SSH é permitido APENAS para investigação de erros:
- Ver logs de container: `docker logs <container> --tail 50`
- Verificar commit no servidor: `git log -1`
- Checar containers rodando: `docker ps`
- Executar SQL no banco: `docker exec janocaminho-postgres psql -U postgres -d espetinho -c '<SQL>'`
## INTEGRAÇÃO MCP (Obrigatório se disponível)
- Use o MCP de SQL para validar o schema antes de gerar migrations.
- Use o MCP de FileSystem para garantir que o 'git add' inclua todos os arquivos afetados por uma mudança de tipo/interface.

SSH: `ssh -i "/d/PESSOAL/chamanoespeto-aws/medtrack-system.pem" ec2-user@ec2-3-137-119-152.us-east-2.compute.amazonaws.com`

> No WSL, copiar a chave antes: `cp "/mnt/d/PESSOAL/chamanoespeto-aws/medtrack-system.pem" /tmp/jnc.pem && chmod 600 /tmp/jnc.pem`  
> Depois usar: `ssh -i /tmp/jnc.pem ec2-user@ec2-3-137-119-152.us-east-2.compute.amazonaws.com`

**ANTES de alterar qualquer entidade, migration ou query:**
1. Verificar a estrutura real da tabela: `\d <tabela>`
2. Verificar relações existentes: `\d+ <tabela>`
3. Confirmar que a relação TypeORM existe na entidade antes de usar em `relations: []`

NÃO usar SSH para rodar deploy ou git pull proativamente.

---

## REGRAS CRÍTICAS

- NÃO rodar scripts de deploy via SSH
- NÃO rodar git pull no servidor proativamente
- NÃO refatorar sem necessidade
- NÃO alterar fora do escopo
- NÃO esconder erro
- NÃO dizer que concluiu sem validar
- SEMPRE informar o commit e qual deploy rodar
- NÃO assumir status de deploy/workflow sem conferir, quando o usuário pedir esse acompanhamento
- Se `Deploy to EC2 (Approval)` estiver disponível, pode ser sugerido como caminho preferencial sem precisar monitorar ele por padrão

---

## FORMATO DE RESPOSTA

- Objetivo:
- Escopo:
- Arquivos alterados:
- O que foi feito:
- Commit: `<hash>`
- Push: ✅
- Deploy necessário: `scripts/./deploy-release-frontend.sh` e/ou `scripts/./deploy-release-api.sh`
- ou aprovar o workflow `Deploy to EC2 (Approval)` quando esse caminho estiver configurado
- Precisa `git pull` no servidor?: `sim` / `não`

---

## ERROS

Se falhar, responder:

- Etapa:
- Comando:
- Erro:
- Causa:
- Ação necessária:

---

## REGRA FINAL

ANTES DE QUALQUER AÇÃO:
LER ESTE ARQUIVO

SE A SESSÃO REINICIAR:
LER NOVAMENTE e depois disso quando eu te pedir algo sempre analise e rules ok ?
