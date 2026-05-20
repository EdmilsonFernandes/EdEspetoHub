# MCP para banco e Git workflow

Este guia documenta uma configuracao MCP segura para agentes de IA trabalharem com o Ja no Caminho. O arquivo versionado `.mcp.example.json` e apenas exemplo; nao coloque tokens, senhas reais ou chaves no Git.

## Objetivo

- Dar contexto do banco para investigacao e validacao de schema.
- Dar contexto do GitHub workflow para consultar Actions, commits e status de deploy.
- Evitar SSH/manual quando um MCP read-only puder responder com seguranca.

## Servidores recomendados

### Postgres local

Use para desenvolvimento local e validacao de schema.

Exemplo em `.mcp.example.json`:

```json
{
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-postgres",
    "postgresql://postgres:postgres@localhost:5432/espetinho"
  ]
}
```

Recomendacao:

- Em producao, prefira um usuario PostgreSQL read-only.
- Se precisar consultar producao, use tunel SSH local e aponte o MCP para `localhost`.
- Nao versionar URI com senha real.

### GitHub workflow

Use o servidor oficial GitHub MCP para consultar Actions, workflow runs, issues, PRs e metadados do repositorio.

Exemplo:

```json
{
  "command": "docker",
  "args": [
    "run",
    "-i",
    "--rm",
    "-e",
    "GITHUB_PERSONAL_ACCESS_TOKEN",
    "ghcr.io/github/github-mcp-server"
  ],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
  }
}
```

Permissoes minimas sugeridas para token:

- `repo:read` para leitura de repositorio privado.
- `actions:read` para consultar workflows.
- Evite permissao de escrita se o objetivo for apenas acompanhar deploy.

### Git local

Use para inspecionar historico, diff e branches locais via MCP.

Exemplo:

```json
{
  "command": "uvx",
  "args": [
    "mcp-server-git",
    "--repository",
    "."
  ]
}
```

Mesmo com MCP local, o fluxo obrigatorio do projeto continua:

- `git status`
- `git add <arquivos especificos>`
- `git commit -m "<mensagem>"`
- `git push`

## Usuario read-only para banco

Se quiser criar um usuario apenas leitura no PostgreSQL de producao, rode manualmente depois de definir uma senha forte. Nao grave essa senha em arquivo versionado.

```sql
CREATE ROLE jnc_readonly LOGIN PASSWORD 'troque-por-uma-senha-forte';
GRANT CONNECT ON DATABASE espetinho TO jnc_readonly;
GRANT USAGE ON SCHEMA public TO jnc_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO jnc_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO jnc_readonly;
```

URI local via tunel:

```text
postgresql://jnc_readonly:<senha>@localhost:15432/espetinho
```

Tunel SSH exemplo:

```bash
ssh -i "<sua-chave>.pem" -L 15432:localhost:5432 ec2-user@ec2-3-137-119-152.us-east-2.compute.amazonaws.com
```

## Checklist para usar MCP com seguranca

- Confirme se o agente leu `AGENTS.md`, `.ai/agent-rules.md` e `README.md`.
- Para banco, comece sempre por `SELECT`, `information_schema` ou `\d`.
- Para producao, prefira usuario read-only.
- Para GitHub, use token com menor permissao possivel.
- Nunca use MCP para deploy automatico sem aprovacao explicita.
- Nunca deixe MCP escrever em banco de producao sem revisao humana.

## Referencias

- GitHub MCP Server oficial: https://github.com/github/github-mcp-server
- Imagem Docker oficial do GitHub MCP: `ghcr.io/github/github-mcp-server`
- Postgres MCP reference server: pacote `@modelcontextprotocol/server-postgres`
- Git MCP reference server: pacote `mcp-server-git`
