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

Scripts de deploy (o usuário executa):
scripts/./deploy-frontend.sh  
scripts/./deploy-api.sh  

---

## DECISÃO DE DEPLOY (informar ao usuário)

- frontend alterado → rodar deploy-frontend.sh
- api alterada → rodar deploy-api.sh
- ambos alterados → deploy-api.sh e depois deploy-frontend.sh

---

## FLUXO OBRIGATÓRIO

### 1. ENTENDER
- Resumir objetivo em 1 frase

### 2. ESCOPO
- frontend / api / ambos

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
- Escopo: frontend / api / ambos
- Script(s) a rodar no servidor

---

## USO DE SSH

SSH é permitido APENAS para investigação de erros:
- Ver logs de container: `docker logs <container> --tail 50`
- Verificar commit no servidor: `git log -1`
- Checar containers rodando: `docker ps`
- Executar SQL no banco: `docker exec chamanoespeto-postgres psql -U postgres -d espetinho -c '<SQL>'`

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

---

## FORMATO DE RESPOSTA

- Objetivo:
- Escopo:
- Arquivos alterados:
- O que foi feito:
- Commit: `<hash>`
- Push: ✅
- Deploy necessário: `scripts/./deploy-frontend.sh` e/ou `scripts/./deploy-api.sh`

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
